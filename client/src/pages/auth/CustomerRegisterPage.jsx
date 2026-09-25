import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
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
import { registerCustomerRequest } from '../../services/customerPortalService';
import { setCredentials } from '../../redux/authSlice';
import PasswordField from '../../components/PasswordField';

export default function CustomerRegisterPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState(null);
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm({
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      phone: '',
      company: '',
      city: '',
    },
  });

  const onSubmit = async (values) => {
    setSubmitError(null);
    try {
      const result = await registerCustomerRequest(values);
      dispatch(setCredentials(result.data));
      toast.success('Welcome! Your customer account is ready.');
      navigate('/customer/dashboard', { replace: true });
    } catch (error) {
      setSubmitError(error.message || 'Unable to register');
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Customer registration
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Create a portal account to track orders, invoices, and support requests. Staff roles cannot
        be selected here.
      </Typography>

      {submitError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {submitError}
        </Alert>
      )}

      <Stack spacing={2}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField label="First name" fullWidth required {...register('firstName')} />
          <TextField label="Last name" fullWidth required {...register('lastName')} />
        </Stack>
        <TextField label="Email" type="email" fullWidth required {...register('email')} />
        <PasswordField
          label="Password"
          fullWidth
          required
          autoComplete="new-password"
          helperText="Min 8 chars with upper, lower, and a number"
          {...register('password')}
        />
        <TextField label="Phone" fullWidth {...register('phone')} />
        <TextField label="Company" fullWidth {...register('company')} />
        <TextField label="City" fullWidth {...register('city')} />
        <Button type="submit" variant="contained" size="large" disabled={isSubmitting}>
          {isSubmitting ? <CircularProgress size={22} color="inherit" /> : 'Create account'}
        </Button>
        <Typography variant="body2" textAlign="center">
          Already have an account?{' '}
          <Link component={RouterLink} to="/login" fontWeight={600}>
            Sign in
          </Link>
        </Typography>
      </Stack>
    </Box>
  );
}
