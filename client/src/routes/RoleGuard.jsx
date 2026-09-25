import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

/**
 * Frontend UX guard only — backend still enforces authorization.
 */
export default function RoleGuard({ roles = [], children, fallback = '/403' }) {
  const user = useSelector((state) => state.auth.user);
  const roleName = user?.role?.name;

  if (!roles.length) {
    return children;
  }

  if (!roleName || !roles.includes(roleName)) {
    return <Navigate to={fallback} replace />;
  }

  return children;
}
