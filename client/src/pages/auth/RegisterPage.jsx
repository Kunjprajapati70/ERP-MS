import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import {
  Alert,
  Button,
  CircularProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { registerSchema } from '../../validators/authSchemas';
import { registerRequest } from '../../services/authService';
import { setCredentials } from '../../redux/authSlice';
import PasswordField from '../../components/PasswordField';

const ROLE_OPTIONS = [
  { value: 'SALES_EXECUTIVE', label: 'Sales Executive' },
  { value: 'SALES_MANAGER', label: 'Sales Manager' },
  { value: 'PURCHASE_MANAGER', label: 'Purchase Manager' },
  { value: 'INVENTORY_MANAGER', label: 'Inventory Manager' },
  { value: 'ACCOUNTANT', label: 'Accountant' },
  { value: 'HR_MANAGER', label: 'HR Manager' },
  { value: 'PRODUCTION_MANAGER', label: 'Production Manager' },
];

export default function RegisterPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      roleName: 'SALES_EXECUTIVE',
    },
  });

  const onSubmit = async (values) => {
    setSubmitError(null);
    try {
      const { confirmPassword, ...payload } = values;
      const result = await registerRequest(payload);
      dispatch(setCredentials(result.data));
      toast.success('Account created');
      navigate('/', { replace: true });
    } catch (error) {
      const details = error.details?.map((d) => d.message).join(' ') || '';
      setSubmitError(`${error.message || 'Registration failed'}${details ? `: ${details}` : ''}`);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Create account
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Register a workspace user. Admin roles cannot be self-assigned.
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
            {...register('firstName')}
            error={Boolean(errors.firstName)}
            helperText={errors.firstName?.message}
          />
          <TextField
            label="Last name"
            fullWidth
            {...register('lastName')}
            error={Boolean(errors.lastName)}
            helperText={errors.lastName?.message}
          />
        </Stack>
        <TextField
          label="Email"
          type="email"
          fullWidth
          {...register('email')}
          error={Boolean(errors.email)}
          helperText={errors.email?.message}
        />
        <TextField label="Phone" fullWidth {...register('phone')} />
        <TextField
          select
          label="Role"
          fullWidth
          defaultValue="SALES_EXECUTIVE"
          {...register('roleName')}
        >
          {ROLE_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </TextField>
        <PasswordField
          label="Password"
          fullWidth
          autoComplete="new-password"
          {...register('password')}
          error={Boolean(errors.password)}
          helperText={errors.password?.message}
        />
        <PasswordField
          label="Confirm password"
          fullWidth
          autoComplete="new-password"
          {...register('confirmPassword')}
          error={Boolean(errors.confirmPassword)}
          helperText={errors.confirmPassword?.message}
        />
        <Button type="submit" variant="contained" size="large" disabled={isSubmitting}>
          {isSubmitting ? <CircularProgress size={22} color="inherit" /> : 'Create account'}
        </Button>
      </Stack>
    </form>
  );
}
