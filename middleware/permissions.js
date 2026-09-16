/**
 * Checks if current user has the required permission either directly in role
 * or possesses super admin wildcard '*'.
 */
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const role = req.user.role;
    if (!role || !Array.isArray(role.permissions)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: No permissions assigned to your role',
      });
    }

    const hasWildcard = role.permissions.includes('*');
    const hasExplicit = role.permissions.includes(permission);

    if (hasWildcard || hasExplicit) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: `Access denied. Missing required permission: '${permission}'`,
    });
  };
};

/**
 * Checks if user has permission to access a specific system by slug or permission code
 */
const canAccessSystem = (user, system) => {
  if (!user || !user.role) return false;
  const permissions = user.role.permissions || [];
  
  if (permissions.includes('*')) return true;

  // Check required permission on system object
  if (system.requiredPermission && permissions.includes(system.requiredPermission)) {
    return true;
  }

  // Check generic pattern e.g. 'supply-pms.access' or slug match
  if (permissions.includes(`${system.slug}.access`)) {
    return true;
  }

  // Check direct user systemAccess override array
  if (user.systemAccess && user.systemAccess.includes(system.slug)) {
    return true;
  }

  return false;
};

module.exports = { requirePermission, canAccessSystem };
