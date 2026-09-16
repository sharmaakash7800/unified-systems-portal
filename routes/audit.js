const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');

// @route   GET /api/audit-logs
// @desc    Get audit trail logs (requires 'audit.view' or '*' permission)
router.get('/', authenticate, requirePermission('audit.view'), async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 100, 200);
    const logs = await AuditLog.find()
      .sort({ timestamp: -1 })
      .limit(limit);

    return res.json({ success: true, logs });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch audit logs' });
  }
});

module.exports = router;
