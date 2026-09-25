import { Box, Card, CardContent, Container, Link, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Link as RouterLink, Outlet, useLocation } from 'react-router-dom';

export default function AuthLayout() {
  const appName = import.meta.env.VITE_APP_NAME || 'Enterprise ERP';
  const { pathname } = useLocation();
  const onCustomerRegister = pathname === '/customer/register';

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
        py: { xs: 3, sm: 5 },
        px: { xs: 1.5, sm: 2 },
        background: (theme) =>
          theme.palette.mode === 'light'
            ? `radial-gradient(ellipse 80% 60% at 10% 0%, ${alpha('#4FC3DC', 0.28)}, transparent 50%),
               radial-gradient(ellipse 70% 50% at 100% 10%, ${alpha('#0B4F6C', 0.18)}, transparent 45%),
               linear-gradient(165deg, #DCEAF1 0%, #E8F1F5 40%, #F4F8FA 100%)`
            : `radial-gradient(ellipse 70% 50% at 0% 0%, ${alpha('#4FC3DC', 0.15)}, transparent 50%),
               linear-gradient(165deg, #06141C 0%, #0A2430 55%, #0B4F6C 140%)`,
      }}
    >
      <Container maxWidth="sm" sx={{ position: 'relative', zIndex: 1, px: { xs: 1, sm: 2 } }}>
        <Stack spacing={1} alignItems="center" sx={{ mb: { xs: 2, sm: 3 }, textAlign: 'center' }}>
          <Typography
            variant="overline"
            sx={{ color: 'primary.main', letterSpacing: 2, fontWeight: 700, fontSize: { xs: '0.65rem', sm: '0.75rem' } }}
          >
            Harbor operations suite
          </Typography>
          <Typography
            variant="h3"
            component="h1"
            sx={{
              fontWeight: 700,
              fontSize: { xs: '1.55rem', sm: '2.35rem' },
              letterSpacing: '-0.03em',
            }}
          >
            {appName}
          </Typography>
          <Typography color="text.secondary" sx={{ maxWidth: 420, fontSize: { xs: '0.82rem', sm: '0.95rem' } }}>
            {onCustomerRegister
              ? 'Create a customer account to shop, place orders, and track invoices.'
              : 'Sign in to continue. New users can create a customer account below.'}
          </Typography>
        </Stack>
        <Card
          elevation={0}
          sx={{
            borderRadius: { xs: 2.5, sm: 3 },
            overflow: 'hidden',
            border: 1,
            borderColor: 'divider',
            boxShadow: (t) =>
              t.palette.mode === 'light'
                ? `0 20px 50px ${alpha('#0B4F6C', 0.12)}`
                : `0 20px 50px ${alpha('#000', 0.45)}`,
          }}
        >
          <Box
            sx={{
              height: 4,
              background: 'linear-gradient(90deg, #0B4F6C, #4FC3DC, #E07A3D)',
            }}
          />
          <CardContent sx={{ p: { xs: 2, sm: 3.5 } }}>
            <Outlet />
          </CardContent>
        </Card>
        <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mt: 2.5 }}>
          Need help? Contact your system administrator.
        </Typography>
        <Typography variant="body2" textAlign="center" sx={{ mt: 1 }}>
          {onCustomerRegister ? (
            <>
              Already have an account?{' '}
              <Link component={RouterLink} to="/login" underline="hover" fontWeight={700}>
                Sign in
              </Link>
            </>
          ) : (
            <>
              New user?{' '}
              <Link component={RouterLink} to="/customer/register" underline="hover" fontWeight={700}>
                Create an account
              </Link>
            </>
          )}
        </Typography>
      </Container>
    </Box>
  );
}
