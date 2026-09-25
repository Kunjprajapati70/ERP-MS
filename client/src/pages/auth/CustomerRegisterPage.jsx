import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Link,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { customerRegisterSchema } from '../../validators/authSchemas';
import { registerCustomerRequest } from '../../services/customerPortalService';
import { setCredentials } from '../../redux/authSlice';
import { markKnownCustomerAccount } from '../../utils/customerVisit';
import PasswordField from '../../components/PasswordField';

export default function CustomerRegisterPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(customerRegisterSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      phone: '',
      company: '',
      city: '',
    },
  });

  const onSubmit = async (values) => {
    setSubmitError(null);
    try {
      const { confirmPassword, ...payload } = values;
      const result = await registerCustomerRequest(payload);
      dispatch(setCredentials(result.data));
      markKnownCustomerAccount();
      toast.success('Welcome! Your customer account is ready.');
      navigate('/customer/dashboard', { replace: true });
    } catch (error) {
      const details = error.details?.map((d) => d.message).join(' ') || '';
      setSubmitError(`${error.message || 'Unable to register'}${details ? `: ${details}` : ''}`);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        New user registration
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        First-time customers must create an account before using the store, orders, and invoices.
      </Typography>

      {submitError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {submitError}
        </Alert>
      )}

      <Stack spacing={2}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            label="First name"
            fullWidth
            required
            {...register('firstName')}
            error={Boolean(errors.firstName)}
            helperText={errors.firstName?.message}
          />
          <TextField
            label="Last name"
            fullWidth
            required
            {...register('lastName')}
            error={Boolean(errors.lastName)}
            helperText={errors.lastName?.message}
          />
        </Stack>
        <TextField
          label="Email"
          type="email"
          fullWidth
          required
          {...register('email')}
          error={Boolean(errors.email)}
          helperText={errors.email?.message}
        />
        <PasswordField
          label="Password"
          fullWidth
          required
          autoComplete="new-password"
          {...register('password')}
          error={Boolean(errors.password)}
          helperText={errors.password?.message || 'Min 8 characters with upper, lower, and a number'}
        />
        <PasswordField
          label="Confirm password"
          fullWidth
          required
          autoComplete="new-password"
          {...register('confirmPassword')}
          error={Boolean(errors.confirmPassword)}
          helperText={errors.confirmPassword?.message}
        />
        <TextField
          label="Phone"
          fullWidth
          {...register('phone')}
          error={Boolean(errors.phone)}
          helperText={errors.phone?.message}
        />
        <TextField label="Company" fullWidth {...register('company')} />
        <TextField label="City" fullWidth {...register('city')} />
        <Button type="submit" variant="contained" size="large" disabled={isSubmitting}>
          {isSubmitting ? <CircularProgress size={22} color="inherit" /> : 'Create account'}
        </Button>
        <Typography variant="body2" textAlign="center">
          Already have an account?{' '}
          <Link component={RouterLink} to="/login" fontWeight={700}>
            Sign in
          </Link>
        </Typography>
      </Stack>
    </Box>
  );
}
