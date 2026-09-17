const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');
const sendEmail = require('../utils/sendEmail');

// Rate limiter for login endpoint to prevent brute-force
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 attempts per window
  message: {
    success: false,
    message: 'Too many login attempts from this IP. Please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// @route   POST /api/auth/login
// @desc    Authenticate user & get JWT token
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail }).populate('role');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      await logAudit({
        req,
        action: 'auth.login.failed',
        targetType: 'User',
        targetId: user._id,
        details: { email: cleanEmail, reason: 'Incorrect password' },
      });

      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: `Account is ${user.status}. Please contact an administrator.`,
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Create JWT
    const secret = process.env.JWT_SECRET || 'super_secret_enterprise_jwt_key_change_in_production_12345';
    const token = jwt.sign(
      {
        userId: user._id,
        roleId: user.role?._id,
      },
      secret,
      { expiresIn: process.env.SESSION_EXPIRES_IN || '7d' }
    );

    // Set secure cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    await logAudit({
      req: { ...req, user },
      action: 'auth.login.success',
      targetType: 'User',
      targetId: user._id,
      details: { email: cleanEmail },
    });

    return res.json({
      success: true,
      message: 'Logged in successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
          ? {
              id: user.role._id,
              name: user.role.name,
              permissions: user.role.permissions,
            }
          : null,
        systemAccess: user.systemAccess,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during authentication',
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get currently logged in user profile
router.get('/me', authenticate, async (req, res) => {
  return res.json({
    success: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      status: req.user.status,
      role: req.user.role
        ? {
            id: req.user.role._id,
            name: req.user.role.name,
            permissions: req.user.role.permissions,
          }
        : null,
      systemAccess: req.user.systemAccess,
      lastLogin: req.user.lastLogin,
    },
  });
});

// @route   POST /api/auth/logout
// @desc    Clear session cookie
router.post('/logout', authenticate, async (req, res) => {
  res.clearCookie('token');
  await logAudit({
    req,
    action: 'auth.logout',
    targetType: 'User',
    targetId: req.user._id,
  });
  return res.json({
    success: true,
    message: 'Logged out successfully',
  });
});

// @route   POST /api/auth/forgot-password
// @desc    Send password reset email
router.post('/forgot-password', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'There is no user with that email',
      });
    }

    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    // Ensure we are getting the origin correct whether it's local or prod
    const resetUrl = `${req.protocol}://${req.get('host')}/reset-password.html?token=${resetToken}`;

    const message = `You are receiving this email because you (or someone else) requested a password reset. Please make a PUT request to: \n\n ${resetUrl}`;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Password Reset Token',
        message,
        html: `
          <h3>Password Reset Requested</h3>
          <p>You requested a password reset. Click the link below to set a new password.</p>
          <a href="${resetUrl}">Reset Password</a>
          <br>
          <p>If you did not request this, please ignore this email.</p>
        `,
      });

      res.status(200).json({ success: true, message: 'Email sent' });
    } catch (err) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
      return res.status(500).json({ success: false, message: 'Email could not be sent' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/auth/reset-password/:token
// @desc    Reset password using token
router.post('/reset-password/:token', async (req, res) => {
  try {
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired token' });
    }

    if (!req.body.password) {
      return res.status(400).json({ success: false, message: 'Password is required' });
    }

    user.passwordHash = await User.hashPassword(req.body.password);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.status(200).json({ success: true, message: 'Password reset successful' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
