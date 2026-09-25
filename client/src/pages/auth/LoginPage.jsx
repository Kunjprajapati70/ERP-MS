import { useState } from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardActionArea,
  Chip,
  CircularProgress,
  Divider,
  Link,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  AdminPanelSettingsRounded as AdminIcon,
  StorefrontRounded as CustomerIcon,
  BadgeRounded as EmployeeIcon,
  TouchAppRounded as TapIcon,
  CheckCircleRounded as CheckCircleIcon,
  LockRounded as LockIcon,
} from '@mui/icons-material';
import { useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { loginSchema } from '../../validators/authSchemas';
import { loginRequest } from '../../services/authService';
import { setCredentials } from '../../redux/authSlice';
import PasswordField from '../../components/PasswordField';

const PINNED_ACCOUNTS = [
  {
    id: 'admin',
    title: 'Admin',
    badge: 'ADMIN',
    badgeLabel: 'Full ERP Access',
    email: 'admin@erp.local',
    password: 'Admin@12345',
    description: 'Finance, inventory, HR, CRM & all system settings',
    icon: AdminIcon,
    color: '#0B4F6C',
  },
  {
    id: 'customer',
    title: 'Demo Customer',
    badge: 'CUSTOMER',
    badgeLabel: 'Customer Portal',
    email: 'customer@erp.local',
    password: 'Customer@12345',
    description: 'Online store, product catalog, orders & invoices',
    icon: CustomerIcon,
    color: '#E07A3D',
  },
  {
    id: 'employee',
    title: 'Employee',
    badge: 'EMPLOYEE',
    badgeLabel: 'Sales & Ops',
    email: 'employee@erp.local',
    password: 'Employee@12345',
    description: 'Check in/out, sales operations, CRM leads & daily workflows',
    icon: EmployeeIcon,
    color: '#1B7A4E',
  },
];

export default function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [submitError, setSubmitError] = useState(null);
  const [activeAccountId, setActiveAccountId] = useState(null);

  const {
    register,
    handleSubmit,
    setValue,
    clearErrors,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const emailValue = watch('email');
  const passwordValue = watch('password');

  const onSubmit = async (values) => {
    setSubmitError(null);
    try {
      const result = await loginRequest(values);
      dispatch(setCredentials(result.data));
      toast.success(`Welcome back, ${result.data?.user?.firstName || 'User'}!`);
      const roleName = result.data?.user?.role?.name;
      const fallback = roleName === 'CUSTOMER' ? '/customer/dashboard' : '/dashboard';
      const from = location.state?.from?.pathname;
      const redirectTo =
        roleName === 'CUSTOMER'
          ? from?.startsWith('/customer')
            ? from
            : '/customer/dashboard'
          : from && !from.startsWith('/customer')
            ? from
            : fallback;
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setSubmitError(error.message || 'Unable to sign in');
    }
  };

  const handleSelectAccount = (account) => {
    setActiveAccountId(account.id);
    setValue('email', account.email, { shouldValidate: true });
    setValue('password', account.password, { shouldValidate: true });
    clearErrors();
    setSubmitError(null);
    toast.info(`${account.title} credentials filled! Click "Sign in" below.`, {
      autoClose: 2000,
      hideProgressBar: true,
    });
  };

  const selectedAccount = PINNED_ACCOUNTS.find((a) => a.id === activeAccountId);

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <Typography
        variant="h5"
        fontWeight={700}
        gutterBottom
        sx={{ fontSize: { xs: '1.35rem', sm: '1.65rem' } }}
      >
        Sign in
      </Typography>
      <Typography
        color="text.secondary"
        sx={{ mb: 2, fontSize: { xs: '0.85rem', sm: '0.92rem' } }}
      >
        Select a demo account below to autofill, then click <strong>Sign in</strong>.
      </Typography>

      {/* Pinned Demo Accounts with Autofill */}
      <Box sx={{ mb: 2.5 }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: 1.25 }}
        >
          <Stack direction="row" alignItems="center" spacing={0.75}>
            <TapIcon sx={{ color: 'primary.main', fontSize: 18 }} />
            <Typography
              variant="subtitle2"
              fontWeight={700}
              sx={{
                fontSize: { xs: '0.78rem', sm: '0.84rem' },
                letterSpacing: '0.04em',
                color: 'text.primary',
              }}
            >
              PINNED DEMO ACCOUNTS
            </Typography>
          </Stack>
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              fontWeight: 600,
              fontSize: { xs: '0.68rem', sm: '0.72rem' },
            }}
          >
            Click to autofill
          </Typography>
        </Stack>

        <Stack spacing={1.25}>
          {PINNED_ACCOUNTS.map((account) => {
            const IconComponent = account.icon;
            const isSelected = activeAccountId === account.id;

            return (
              <Card
                key={account.id}
                variant="outlined"
                sx={{
                  borderRadius: 2.5,
                  overflow: 'hidden',
                  borderColor: isSelected ? account.color : 'divider',
                  borderWidth: isSelected ? 2 : 1,
                  bgcolor: (theme) =>
                    isSelected
                      ? alpha(account.color, theme.palette.mode === 'dark' ? 0.22 : 0.08)
                      : theme.palette.mode === 'dark'
                        ? alpha('#FFFFFF', 0.03)
                        : alpha('#FFFFFF', 0.85),
                  boxShadow: isSelected
                    ? `0 6px 16px ${alpha(account.color, 0.2)}`
                    : 'none',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&:hover': {
                    borderColor: account.color,
                    bgcolor: (theme) =>
                      alpha(account.color, theme.palette.mode === 'dark' ? 0.16 : 0.05),
                    transform: 'translateY(-1px)',
                  },
                }}
              >
                <CardActionArea
                  onClick={() => handleSelectAccount(account)}
                  sx={{
                    p: { xs: 1.25, sm: 1.5 },
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    textAlign: 'left',
                    minHeight: { xs: 58, sm: 64 },
                  }}
                >
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={{ xs: 1.25, sm: 1.5 }}
                    sx={{ minWidth: 0, flex: 1, pr: 1 }}
                  >
                    <Avatar
                      sx={{
                        bgcolor: alpha(account.color, 0.12),
                        color: account.color,
                        width: { xs: 36, sm: 42 },
                        height: { xs: 36, sm: 42 },
                        flexShrink: 0,
                        border: `1.5px solid ${alpha(account.color, 0.35)}`,
                      }}
                    >
                      <IconComponent sx={{ fontSize: { xs: 20, sm: 24 } }} />
                    </Avatar>

                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Stack
                        direction="row"
                        alignItems="center"
                        spacing={0.75}
                        sx={{ flexWrap: 'wrap', rowGap: 0.25 }}
                      >
                        <Typography
                          variant="subtitle2"
                          fontWeight={700}
                          sx={{ fontSize: { xs: '0.85rem', sm: '0.92rem' } }}
                          noWrap
                        >
                          {account.title}
                        </Typography>
                        <Chip
                          label={account.badge}
                          size="small"
                          sx={{
                            height: 18,
                            fontSize: '0.62rem',
                            fontWeight: 700,
                            letterSpacing: '0.03em',
                            bgcolor: alpha(account.color, 0.14),
                            color: account.color,
                            border: `1px solid ${alpha(account.color, 0.3)}`,
                          }}
                        />
                      </Stack>

                      <Typography
                        variant="caption"
                        sx={{
                          color: 'text.secondary',
                          display: 'block',
                          fontFamily: 'monospace',
                          fontSize: { xs: '0.72rem', sm: '0.78rem' },
                          mt: 0.1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {account.email}
                      </Typography>

                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          display: { xs: 'none', sm: 'block' },
                          fontSize: '0.68rem',
                          opacity: 0.85,
                          mt: 0.1,
                        }}
                      >
                        {account.description}
                      </Typography>
                    </Box>
                  </Stack>

                  {/* Right side selection indicator */}
                  <Box sx={{ flexShrink: 0 }}>
                    {isSelected ? (
                      <Chip
                        icon={<CheckCircleIcon sx={{ fontSize: '15px !important', color: `${account.color} !important` }} />}
                        label="Filled ✓"
                        size="small"
                        sx={{
                          height: 24,
                          fontSize: { xs: '0.68rem', sm: '0.72rem' },
                          fontWeight: 700,
                          bgcolor: alpha(account.color, 0.15),
                          color: account.color,
                          border: `1px solid ${account.color}`,
                        }}
                      />
                    ) : (
                      <Chip
                        label="Autofill"
                        size="small"
                        variant="outlined"
                        sx={{
                          height: 24,
                          fontSize: { xs: '0.68rem', sm: '0.72rem' },
                          fontWeight: 600,
                          color: 'text.secondary',
                          borderColor: 'divider',
                        }}
                      />
                    )}
                  </Box>
                </CardActionArea>
              </Card>
            );
          })}
        </Stack>
      </Box>

      {/* Visual confirmation if an account is selected */}
      {selectedAccount && (
        <Alert
          severity="success"
          icon={<CheckCircleIcon fontSize="inherit" />}
          sx={{
            mb: 2,
            py: 0.5,
            px: 1.5,
            fontSize: '0.82rem',
            alignItems: 'center',
            borderRadius: 2,
          }}
        >
          <strong>{selectedAccount.title}</strong> credentials autofilled. Click <strong>Sign in</strong> below to log in.
        </Alert>
      )}

      <Divider sx={{ my: 2 }}>
        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
            px: 1,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            fontWeight: 600,
            fontSize: '0.68rem',
          }}
        >
          Or sign in manually
        </Typography>
      </Divider>

      {submitError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {submitError}
        </Alert>
      )}

      <Stack spacing={2}>
        <TextField
          label="Email or Username"
          type="email"
          autoComplete="email"
          fullWidth
          value={emailValue ?? ''}
          InputLabelProps={{ shrink: true }}
          {...register('email')}
          error={Boolean(errors.email)}
          helperText={errors.email?.message}
          inputProps={{ style: { fontSize: '0.95rem' } }}
        />
        <PasswordField
          label="Password"
          autoComplete="current-password"
          fullWidth
          value={passwordValue ?? ''}
          InputLabelProps={{ shrink: true }}
          {...register('password')}
          error={Boolean(errors.password)}
          helperText={errors.password?.message}
        />
        <Box textAlign="right">
          <Link component={RouterLink} to="/forgot-password" underline="hover" variant="body2">
            Forgot password?
          </Link>
        </Box>
        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={isSubmitting}
          startIcon={!isSubmitting && <LockIcon fontSize="small" />}
          sx={{
            py: { xs: 1.25, sm: 1.4 },
            fontSize: { xs: '0.95rem', sm: '1rem' },
            fontWeight: 700,
            borderRadius: 2,
            minHeight: 48,
          }}
        >
          {isSubmitting ? (
            <CircularProgress size={22} color="inherit" />
          ) : selectedAccount ? (
            `Sign in as ${selectedAccount.title}`
          ) : (
            'Sign in'
          )}
        </Button>
      </Stack>
    </Box>
  );
}
