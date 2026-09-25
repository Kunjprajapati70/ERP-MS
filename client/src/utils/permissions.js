export function isAdminUser(user) {
  const roleName = user?.role?.name;
  return roleName === 'ADMIN' || roleName === 'SUPER_ADMIN';
}

export function isCustomerUser(user) {
  return user?.role?.name === 'CUSTOMER';
}

const ATTENDANCE_ELIGIBLE_ROLES = [
  'EMPLOYEE',
  'SALES_MANAGER',
  'SALES_EXECUTIVE',
  'PURCHASE_MANAGER',
  'INVENTORY_MANAGER',
  'ACCOUNTANT',
  'HR_MANAGER',
  'PRODUCTION_MANAGER',
];

export function isAttendanceEligible(user) {
  const roleName = user?.role?.name;
  if (!roleName || isAdminUser(user) || isCustomerUser(user)) return false;
  if (ATTENDANCE_ELIGIBLE_ROLES.includes(roleName)) return true;
  return Array.isArray(user?.role?.permissions) && user.role.permissions.includes('attendance:self');
}

export function hasPermission(user, permission) {
  if (!user?.role) return false;
  if (permission === 'attendance:self') return isAttendanceEligible(user);
  if (isAdminUser(user)) return true;
  return Array.isArray(user.role.permissions) && user.role.permissions.includes(permission);
}

export function hasAnyPermission(user, permissions = []) {
  return permissions.some((p) => hasPermission(user, p));
}

export function hasRole(user, roles = []) {
  if (!user?.role?.name) return false;
  return roles.includes(user.role.name);
}
