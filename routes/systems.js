const express = require('express');
const router = express.Router();
const System = require('../models/System');
const { authenticate } = require('../middleware/auth');
const { requirePermission, canAccessSystem } = require('../middleware/permissions');
const { logAudit } = require('../middleware/audit');

// @route   GET /api/systems/my-systems
// @desc    Get all active systems the current logged-in user is authorized to access
router.get('/my-systems', authenticate, async (req, res) => {
  try {
    const systems = await System.find({ status: 'active' }).sort({ sortOrder: 1, name: 1 });

    // Filter systems based on user permissions
    const authorizedSystems = systems.filter((sys) => canAccessSystem(req.user, sys));

    return res.json({
      success: true,
      systems: authorizedSystems,
    });
  } catch (error) {
    console.error('Error fetching user systems:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve systems' });
  }
});

// @route   GET /api/systems
// @desc    Get all registered systems (requires 'systems.view' or 'systems.manage')
router.get('/', authenticate, requirePermission('systems.view'), async (req, res) => {
  try {
    const systems = await System.find().sort({ sortOrder: 1, name: 1 });
    return res.json({
      success: true,
      systems,
    });
  } catch (error) {
    console.error('Error listing systems:', error);
    return res.status(500).json({ success: false, message: 'Failed to list systems' });
  }
});

// @route   POST /api/systems
// @desc    Register a new system (requires 'systems.manage')
router.post('/', authenticate, requirePermission('systems.manage'), async (req, res) => {
  try {
    const { name, slug, description, icon, url, category, status, sortOrder, requiredPermission } = req.body;

    if (!name || !slug || !url) {
      return res.status(400).json({
        success: false,
        message: 'Name, slug, and URL are required fields',
      });
    }

    const cleanSlug = String(slug).trim().toLowerCase();
    const existing = await System.findOne({ slug: cleanSlug });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `System with slug "${cleanSlug}" already exists`,
      });
    }

    const system = await System.create({
      name: String(name).trim(),
      slug: cleanSlug,
      description: description || '',
      icon: icon || 'grid',
      url: String(url).trim(),
      category: category || 'Core Operations',
      status: status || 'active',
      sortOrder: Number(sortOrder) || 0,
      requiredPermission: requiredPermission || `${cleanSlug}.access`,
    });

    await logAudit({
      req,
      action: 'system.created',
      targetType: 'System',
      targetId: system._id,
      details: { name: system.name, slug: system.slug, url: system.url },
    });

    return res.status(201).json({
      success: true,
      message: 'System registered successfully',
      system,
    });
  } catch (error) {
    console.error('Error creating system:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to create system' });
  }
});

// @route   PUT /api/systems/:id
// @desc    Update system configuration (requires 'systems.manage')
router.put('/:id', authenticate, requirePermission('systems.manage'), async (req, res) => {
  try {
    const { name, slug, description, icon, url, category, status, sortOrder, requiredPermission } = req.body;

    const system = await System.findById(req.params.id);
    if (!system) {
      return res.status(404).json({ success: false, message: 'System not found' });
    }

    if (name) system.name = String(name).trim();
    if (slug) system.slug = String(slug).trim().toLowerCase();
    if (description !== undefined) system.description = description;
    if (icon) system.icon = icon;
    if (url) system.url = String(url).trim();
    if (category) system.category = category;
    if (status) system.status = status;
    if (sortOrder !== undefined) system.sortOrder = Number(sortOrder);
    if (requiredPermission !== undefined) system.requiredPermission = requiredPermission;

    await system.save();

    await logAudit({
      req,
      action: 'system.updated',
      targetType: 'System',
      targetId: system._id,
      details: { name: system.name, slug: system.slug, status: system.status },
    });

    return res.json({
      success: true,
      message: 'System updated successfully',
      system,
    });
  } catch (error) {
    console.error('Error updating system:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to update system' });
  }
});

// @route   DELETE /api/systems/:id
// @desc    Delete a system (requires 'systems.manage')
router.delete('/:id', authenticate, requirePermission('systems.manage'), async (req, res) => {
  try {
    const system = await System.findById(req.params.id);
    if (!system) {
      return res.status(404).json({ success: false, message: 'System not found' });
    }

    await System.findByIdAndDelete(req.params.id);

    await logAudit({
      req,
      action: 'system.deleted',
      targetType: 'System',
      targetId: req.params.id,
      details: { name: system.name, slug: system.slug },
    });

    return res.json({
      success: true,
      message: 'System deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting system:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete system' });
  }
});

module.exports = router;
