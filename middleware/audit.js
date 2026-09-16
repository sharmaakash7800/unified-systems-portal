const AuditLog = require('../models/AuditLog');

const logAudit = async ({ req, action, targetType, targetId, details }) => {
  try {
    const userId = req && req.user ? req.user._id : null;
    const userEmail = req && req.user ? req.user.email : 'System/Anonymous';
    const ipAddress = req ? (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '') : '';

    await AuditLog.create({
      userId,
      userEmail,
      action,
      targetType,
      targetId: targetId ? String(targetId) : '',
      details: details || {},
      ipAddress: String(ipAddress),
      timestamp: new Date(),
    });
  } catch (err) {
    console.error('[AuditLog Error] Failed to write audit log:', err.message);
  }
};

module.exports = { logAudit };
