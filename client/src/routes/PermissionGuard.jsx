import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

/**
 * Frontend UX guard by permission string(s). Backend still enforces access.
 * ADMIN / SUPER_ADMIN are treated as full access for UI purposes.
 */
export default function PermissionGuard({ permissions = [], children, fallback = '/403' }) {
  const user = useSelector((state) => state.auth.user);
  const roleName = user?.role?.name;
  const userPerms = user?.role?.permissions || [];

  if (!permissions.length) {
    return children;
  }

  if (roleName === 'ADMIN' || roleName === 'SUPER_ADMIN') {
    if (permissions.includes('attendance:self')) {
      return <Navigate to={fallback} replace />;
    }
    return children;
  }

  const allowed = permissions.every((p) => userPerms.includes(p));
  if (!allowed) {
    return <Navigate to={fallback} replace />;
  }

  return children;
}
