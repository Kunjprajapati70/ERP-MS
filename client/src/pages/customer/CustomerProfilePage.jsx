import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Grid,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import PageHeader from '../../components/PageHeader';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import ErrorState from '../../components/ErrorState';
import {
  fetchCustomerProfile,
  updateCustomerProfile,
} from '../../services/customerPortalService';

export default function CustomerProfilePage() {
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const { register, handleSubmit, reset, formState } = useForm();

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const res = await fetchCustomerProfile();
      const { user, customer } = res.data;
      reset({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: customer.phone || user.phone || '',
        company: customer.company || '',
        billingAddress: customer.billingAddress || '',
        shippingAddress: customer.shippingAddress || '',
        city: customer.city || '',
        state: customer.state || '',
        country: customer.country || 'India',
        pincode: customer.pincode || '',
        gstin: customer.gstin || '',
      });
      setStatus('success');
    } catch (err) {
      setError(err);
      setStatus('error');
    }
  }, [reset]);

  useEffect(() => {
    load();
  }, [load]);

  const onSubmit = async (values) => {
    setSubmitError(null);
    try {
      const { email, ...payload } = values;
      await updateCustomerProfile(payload);
      toast.success('Profile updated');
      load();
    } catch (err) {
      setSubmitError(err.message || 'Unable to update profile');
    }
  };

  if (status === 'loading') return <LoadingSkeleton rows={6} />;
  if (status === 'error') {
    return <ErrorState title="Unable to load profile" message={error?.message} network={Boolean(error?.isNetworkError)} onRetry={load} />;
  }

  return (
    <Box>
      <PageHeader
        title="Profile"
        subtitle="Update your account and company details."
        breadcrumbs={[{ label: 'Portal', to: '/customer/dashboard' }, { label: 'Profile' }]}
      />

      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        {submitError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {submitError}
          </Alert>
        )}
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField label="First name" fullWidth required {...register('firstName')} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Last name" fullWidth required {...register('lastName')} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Email" fullWidth disabled {...register('email')} helperText="Contact support to change email" />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Phone" fullWidth {...register('phone')} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Company name" fullWidth {...register('company')} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="GST number" fullWidth {...register('gstin')} />
          </Grid>
          <Grid item xs={12}>
            <TextField label="Billing address" fullWidth multiline minRows={2} {...register('billingAddress')} />
          </Grid>
          <Grid item xs={12}>
            <TextField label="Shipping address" fullWidth multiline minRows={2} {...register('shippingAddress')} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField label="City" fullWidth {...register('city')} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField label="State" fullWidth {...register('state')} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField label="Country" fullWidth {...register('country')} />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField label="Pincode" fullWidth {...register('pincode')} />
          </Grid>
        </Grid>
        <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
          <Button type="submit" variant="contained" disabled={formState.isSubmitting}>
            {formState.isSubmitting ? <CircularProgress size={22} color="inherit" /> : 'Save changes'}
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}
