const AppError = require('../utils/AppError');
const { isAttendanceEligibleRole } = require('../constants/roles');

function authorizeRoles(...allowedRoles) {
  const normalized = allowedRoles.map((role) => String(role).toUpperCase());

  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return next(AppError.unauthorized());
    }

    const roleName = req.user.role.name;
    if (!normalized.includes(roleName)) {
      return next(
        AppError.forbidden(
          `Role ${roleName} is not allowed to access this resource`,
          'FORBIDDEN'
        )
      );
    }

    return next();
  };
}

function authorizePermissions(...requiredPermissions) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return next(AppError.unauthorized());
    }

    const roleName = req.user.role.name;
    if (roleName === 'SUPER_ADMIN' || roleName === 'ADMIN') {
      return next();
    }

    const userPermissions = req.user.role.permissions || [];
    const missing = requiredPermissions.filter((p) => !userPermissions.includes(p));

    if (missing.length) {
      return next(
        AppError.forbidden(
          'You do not have permission to perform this action',
          'FORBIDDEN'
        )
      );
    }

    return next();
  };
}

function requireEmployeeAttendance(req, res, next) {
  if (!req.user || !req.user.role) {
    return next(AppError.unauthorized());
  }

  const roleName = req.user.role.name;
  if (!isAttendanceEligibleRole(roleName)) {
    return next(
      AppError.forbidden(
        'Attendance is only required for employees. Administrators and customers do not check in or check out.',
        'ATTENDANCE_NOT_REQUIRED'
      )
    );
  }

  return next();
}

module.exports = {
  authorizeRoles,
  authorizePermissions,
  requireEmployeeAttendance,
};
