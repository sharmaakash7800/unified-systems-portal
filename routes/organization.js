const express = require('express');
const router = express.Router();
const Organization = require('../models/Organization');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');

// @route   GET /api/organization
// @desc    Get current organization branding settings (Public / Authenticated)
router.get('/', async (req, res) => {
  try {
    let org = await Organization.findOne();
    if (!org) {
      org = {
        name: 'Enterprise Universal Portal',
        shortName: 'Portal',
        logoUrl: '',
        branding: { primaryColor: '#2563eb', portalTitle: 'Unified Systems Portal' },
      };
    }
    return res.json({ success: true, organization: org });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch organization settings' });
  }
});

// @route   PUT /api/organization
// @desc    Update organization settings (Super Admin only)
router.put('/', authenticate, requirePermission('*'), async (req, res) => {
  try {
    const { name, shortName, logoUrl, primaryColor, portalTitle, contactEmail } = req.body;
    let org = await Organization.findOne();
    if (!org) {
      org = new Organization();
    }

    if (name) org.name = name;
    if (shortName) org.shortName = shortName;
    if (logoUrl !== undefined) org.logoUrl = logoUrl;
    if (primaryColor) org.branding.primaryColor = primaryColor;
    if (portalTitle) org.branding.portalTitle = portalTitle;
    if (contactEmail) org.contactEmail = contactEmail;

    await org.save();
    return res.json({ success: true, message: 'Organization settings updated', organization: org });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Update failed' });
  }
});

module.exports = router;
