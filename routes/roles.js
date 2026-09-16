const express = require('express');
const router = express.Router();
const Role = require('../models/Role');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');
const { logAudit } = require('../middleware/audit');

// List of all standard available permissions in the system for admin configuration
const AVAILABLE_PERMISSIONS = [
  { code: '*', name: 'Full Superadmin Access', category: 'General' },
  { code: 'portal.dashboard.view', name: 'View Central Dashboard', category: 'Portal' },
  { code: 'users.view', name: 'View Users List', category: 'User Management' },
  { code: 'users.create', name: 'Create Users', category: 'User Management' },
  { code: 'users.edit', name: 'Edit Users & Passwords', category: 'User Management' },
  { code: 'roles.manage', name: 'Manage Roles & Permissions', category: 'Access Control' },
  { code: 'systems.view', name: 'View System Registry', category: 'System Registry' },
  { code: 'systems.manage', name: 'Register/Edit Systems', category: 'System Registry' },
  { code: 'audit.view', name: 'View Audit Logs', category: 'Security' },
  { code: 'supply-pms.access', name: 'Supply PMS Access', category: 'Business Systems' },
  { code: 'service-pms.access', name: 'Service PMS Access', category: 'Business Systems' },
];

// @route   GET /api/roles/available-permissions
// @desc    Get complete list of system permissions
router.get('/available-permissions', authenticate, (req, res) => {
  return res.json({ success: true, permissions: AVAILABLE_PERMISSIONS });
});

// @route   GET /api/roles
// @desc    List all roles
router.get('/', authenticate, requirePermission('roles.manage'), async (req, res) => {
  try {
    const roles = await Role.find().sort({ createdAt: 1 });
    return res.json({ success: true, roles });
  } catch (error) {
    console.error('Error fetching roles:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch roles' });
  }
});

// @route   POST /api/roles
// @desc    Create a new role
router.post('/', authenticate, requirePermission('roles.manage'), async (req, res) => {
  try {
    const { name, description, permissions } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Role name is required' });
    }

    const cleanName = String(name).trim();
    const existing = await Role.findOne({ name: cleanName });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Role with this name already exists' });
    }

    const role = await Role.create({
      name: cleanName,
      description: description || '',
      permissions: Array.isArray(permissions) ? permissions : [],
    });

    await logAudit({
      req,
      action: 'role.created',
      targetType: 'Role',
      targetId: role._id,
      details: { name: role.name, permissionsCount: role.permissions.length },
    });

    return res.status(201).json({ success: true, message: 'Role created successfully', role });
  } catch (error) {
    console.error('Error creating role:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to create role' });
  }
});

// @route   PUT /api/roles/:id
// @desc    Update an existing role
router.put('/:id', authenticate, requirePermission('roles.manage'), async (req, res) => {
  try {
    const { name, description, permissions } = req.body;

    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    if (name) role.name = String(name).trim();
    if (description !== undefined) role.description = description;
    if (Array.isArray(permissions)) role.permissions = permissions;

    await role.save();

    await logAudit({
      req,
      action: 'role.updated',
      targetType: 'Role',
      targetId: role._id,
      details: { name: role.name, permissionsCount: role.permissions.length },
    });

    return res.json({ success: true, message: 'Role updated successfully', role });
  } catch (error) {
    console.error('Error updating role:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to update role' });
  }
});

// @route   DELETE /api/roles/:id
// @desc    Delete a custom role
router.delete('/:id', authenticate, requirePermission('roles.manage'), async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    if (role.isSystemRole) {
      return res.status(400).json({
        success: false,
        message: 'System default roles cannot be deleted to prevent accidental lockouts',
      });
    }

    await Role.findByIdAndDelete(req.params.id);

    await logAudit({
      req,
      action: 'role.deleted',
      targetType: 'Role',
      targetId: req.params.id,
      details: { name: role.name },
    });

    return res.json({ success: true, message: 'Role deleted successfully' });
  } catch (error) {
    console.error('Error deleting role:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete role' });
  }
});

module.exports = router;
