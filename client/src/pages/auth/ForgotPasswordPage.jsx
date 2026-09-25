import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import {
  Alert,
  Button,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { forgotPasswordSchema } from '../../validators/authSchemas';
import { forgotPasswordRequest } from '../../services/authService';

export default function ForgotPasswordPage() {
  const [submitError, setSubmitError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [devInfo, setDevInfo] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (values) => {
    setSubmitError(null);
    setSuccess(null);
    setDevInfo(null);
    try {
      const result = await forgotPasswordRequest(values);
      setSuccess(result.message || 'If an account exists, a reset link has been sent.');
      if (result.data?.devResetToken) {
        setDevInfo({
          token: result.data.devResetToken,
          resetUrl: result.data.resetUrl,
        });
      }
    } catch (error) {
      setSubmitError(error.message || 'Unable to process request');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Forgot password
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Enter your account email and we will send a reset link when SMTP is configured.
      </Typography>

      {submitError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {submitError}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}
      {devInfo && (
        <Alert severity="info" sx={{ mb: 2 }}>
          SMTP is not configured. Dev reset link:{' '}
          <a href={devInfo.resetUrl}>{devInfo.resetUrl}</a>
        </Alert>
      )}

      <Stack spacing={2}>
        <TextField
          label="Email"
          type="email"
          fullWidth
          {...register('email')}
          error={Boolean(errors.email)}
          helperText={errors.email?.message}
        />
        <Button type="submit" variant="contained" size="large" disabled={isSubmitting}>
          {isSubmitting ? <CircularProgress size={22} color="inherit" /> : 'Send reset link'}
        </Button>
      </Stack>
    </form>
  );
}
