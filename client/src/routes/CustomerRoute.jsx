import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import ProtectedRoute from './ProtectedRoute';

/** Only CUSTOMER role may access portal routes; staff go to ERP. */
export default function CustomerRoute({ children }) {
  const location = useLocation();
  const user = useSelector((state) => state.auth.user);
  const roleName = user?.role?.name;

  if (roleName && roleName !== 'CUSTOMER') {
    return <Navigate to="/dashboard" replace state={{ from: location }} />;
  }

  return children || <Outlet />;
}

export function CustomerProtectedLayout({ Layout }) {
  return (
    <ProtectedRoute>
      <CustomerRoute>
        <Layout />
      </CustomerRoute>
    </ProtectedRoute>
  );
}

/** Block CUSTOMER from internal ERP shell. */
export function StaffOnlyRoute({ children }) {
  const user = useSelector((state) => state.auth.user);
  if (user?.role?.name === 'CUSTOMER') {
    return <Navigate to="/customer/dashboard" replace />;
  }
  return children;
}
