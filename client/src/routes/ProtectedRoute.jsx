import { Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useSelector } from 'react-redux';
import { hasKnownCustomerAccount } from '../utils/customerVisit';

export default function ProtectedRoute({ children }) {
  const location = useLocation();
  const { token, user, status, initialized } = useSelector((state) => state.auth);

  if (!initialized && !token) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress aria-label="Loading session" />
      </Box>
    );
  }

  if (!token) {
    const visitingCustomerPortal = location.pathname.startsWith('/customer');
    if (visitingCustomerPortal && !hasKnownCustomerAccount()) {
      return <Navigate to="/customer/register" replace state={{ from: location }} />;
    }
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!user && status === 'loading') {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CircularProgress aria-label="Loading session" />
      </Box>
    );
  }

  return children;
}
