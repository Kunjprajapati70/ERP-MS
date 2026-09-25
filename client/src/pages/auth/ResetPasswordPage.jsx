import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import {
  Alert,
  Button,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import { useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { resetPasswordSchema } from '../../validators/authSchemas';
import { resetPasswordRequest } from '../../services/authService';
import { setCredentials } from '../../redux/authSlice';
import PasswordField from '../../components/PasswordField';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = async (values) => {
    setSubmitError(null);
    if (!token) {
      setSubmitError('Reset token is missing from the link.');
      return;
    }
    try {
      const result = await resetPasswordRequest({
        token,
        password: values.password,
      });
      dispatch(setCredentials(result.data));
      toast.success('Password reset successful');
      navigate('/', { replace: true });
    } catch (error) {
      setSubmitError(error.message || 'Unable to reset password');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Reset password
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Choose a new password for your account.
      </Typography>

      {!token && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          This page requires a valid reset token from your email link.
        </Alert>
      )}
      {submitError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {submitError}
        </Alert>
      )}

      <Stack spacing={2}>
        <PasswordField
          label="New password"
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
        <Button type="submit" variant="contained" size="large" disabled={isSubmitting || !token}>
          {isSubmitting ? <CircularProgress size={22} color="inherit" /> : 'Update password'}
        </Button>
      </Stack>
    </form>
  );
}
