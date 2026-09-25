import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import {
  Alert,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import PageHeader from '../../components/PageHeader';
import PasswordField from '../../components/PasswordField';
import { changePasswordSchema } from '../../validators/authSchemas';
import { changePasswordRequest } from '../../services/authService';
import { setCredentials } from '../../redux/authSlice';

export default function ChangePasswordPage() {
  const dispatch = useDispatch();
  const [submitError, setSubmitError] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (values) => {
    setSubmitError(null);
    try {
      const result = await changePasswordRequest({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      dispatch(setCredentials(result.data));
      toast.success('Password updated');
      reset();
    } catch (error) {
      setSubmitError(error.message || 'Unable to change password');
    }
  };

  return (
    <>
      <PageHeader
        title="Change password"
        subtitle="Update your account password. You will stay signed in with a new token."
        breadcrumbs={[
          { label: 'System', to: '/' },
          { label: 'Change password' },
        ]}
      />

      <Paper variant="outlined" sx={{ p: 3, maxWidth: 520 }}>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          {submitError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {submitError}
            </Alert>
          )}
          <Stack spacing={2}>
            <PasswordField
              label="Current password"
              fullWidth
              autoComplete="current-password"
              {...register('currentPassword')}
              error={Boolean(errors.currentPassword)}
              helperText={errors.currentPassword?.message}
            />
            <PasswordField
              label="New password"
              fullWidth
              autoComplete="new-password"
              {...register('newPassword')}
              error={Boolean(errors.newPassword)}
              helperText={errors.newPassword?.message}
            />
            <PasswordField
              label="Confirm new password"
              fullWidth
              autoComplete="new-password"
              {...register('confirmPassword')}
              error={Boolean(errors.confirmPassword)}
              helperText={errors.confirmPassword?.message}
            />
            <Button type="submit" variant="contained" disabled={isSubmitting}>
              {isSubmitting ? <CircularProgress size={22} color="inherit" /> : 'Save password'}
            </Button>
          </Stack>
        </form>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Use at least 8 characters with uppercase, lowercase, and a number.
        </Typography>
      </Paper>
    </>
  );
}
