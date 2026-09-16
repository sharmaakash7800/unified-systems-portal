const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Role = require('../models/Role');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');
const { logAudit } = require('../middleware/audit');

// @route   GET /api/users
// @desc    List all users with their roles
router.get('/', authenticate, requirePermission('users.view'), async (req, res) => {
  try {
    const users = await User.find()
      .populate('role', 'name permissions isSystemRole')
      .select('-passwordHash')
      .sort({ createdAt: -1 });

    return res.json({ success: true, users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
});

// @route   POST /api/users
// @desc    Create a new user
router.post('/', authenticate, requirePermission('users.create'), async (req, res) => {
  try {
    const { name, email, password, roleId, systemAccess, status } = req.body;

    if (!name || !email || !password || !roleId) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, password, and role are required',
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email already exists',
      });
    }

    const role = await Role.findById(roleId);
    if (!role) {
      return res.status(400).json({ success: false, message: 'Invalid role selected' });
    }

    const passwordHash = await User.hashPassword(password);

    const newUser = await User.create({
      name: String(name).trim(),
      email: cleanEmail,
      passwordHash,
      role: role._id,
      systemAccess: Array.isArray(systemAccess) ? systemAccess : [],
      status: status || 'active',
    });

    await logAudit({
      req,
      action: 'user.created',
      targetType: 'User',
      targetId: newUser._id,
      details: { email: newUser.email, role: role.name },
    });

    const populatedUser = await User.findById(newUser._id)
      .populate('role', 'name permissions')
      .select('-passwordHash');

    return res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: populatedUser,
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to create user' });
  }
});

// @route   PUT /api/users/:id
// @desc    Update user details, role, system access, or status
router.put('/:id', authenticate, requirePermission('users.edit'), async (req, res) => {
  try {
    const { name, email, roleId, systemAccess, status, password } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (name) user.name = String(name).trim();
    if (email) user.email = String(email).trim().toLowerCase();
    if (status) user.status = status;
    if (roleId) {
      const role = await Role.findById(roleId);
      if (!role) return res.status(400).json({ success: false, message: 'Role does not exist' });
      user.role = role._id;
    }
    if (Array.isArray(systemAccess)) {
      user.systemAccess = systemAccess;
    }
    if (password && password.trim().length > 0) {
      user.passwordHash = await User.hashPassword(password.trim());
    }

    await user.save();

    await logAudit({
      req,
      action: 'user.updated',
      targetType: 'User',
      targetId: user._id,
      details: { email: user.email, status: user.status, roleId: user.role },
    });

    const updated = await User.findById(user._id)
      .populate('role', 'name permissions')
      .select('-passwordHash');

    return res.json({
      success: true,
      message: 'User updated successfully',
      user: updated,
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to update user' });
  }
});

// @route   DELETE /api/users/:id
// @desc    Delete user
router.delete('/:id', authenticate, requirePermission('users.edit'), async (req, res) => {
  try {
    if (String(req.user._id) === String(req.params.id)) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own account' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await User.findByIdAndDelete(req.params.id);

    await logAudit({
      req,
      action: 'user.deleted',
      targetType: 'User',
      targetId: req.params.id,
      details: { email: user.email },
    });

    return res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete user' });
  }
});

module.exports = router;
