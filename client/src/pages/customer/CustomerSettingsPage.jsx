import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddLocationAltOutlinedIcon from '@mui/icons-material/AddLocationAltOutlined';
import LockResetIcon from '@mui/icons-material/LockReset';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import { useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import PageHeader from '../../components/PageHeader';
import PasswordField from '../../components/PasswordField';
import { changePasswordSchema } from '../../validators/authSchemas';
import { changePasswordRequest } from '../../services/authService';
import {
  addCustomerAddress,
  deleteCustomerAddress,
  fetchCustomerAddresses,
} from '../../services/customerPortalService';
import { setCredentials } from '../../redux/authSlice';

export default function CustomerSettingsPage() {
  const dispatch = useDispatch();
  const [tab, setTab] = useState(0);
  const [submitError, setSubmitError] = useState(null);

  // Address state
  const [addresses, setAddresses] = useState([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newAddr, setNewAddr] = useState({
    name: '',
    phone: '',
    addressLine: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
  });
  const [savingAddr, setSavingAddr] = useState(false);

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

  const loadAddresses = useCallback(async () => {
    setLoadingAddresses(true);
    try {
      const res = await fetchCustomerAddresses();
      setAddresses(res.data || []);
    } catch {
      // non-blocking
    } finally {
      setLoadingAddresses(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 1) {
      loadAddresses();
    }
  }, [tab, loadAddresses]);

  const onPasswordSubmit = async (values) => {
    setSubmitError(null);
    try {
      const result = await changePasswordRequest({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      dispatch(setCredentials(result.data));
      toast.success('Password updated successfully');
      reset();
    } catch (error) {
      setSubmitError(error.message || 'Unable to change password');
    }
  };

  const handleAddAddress = async () => {
    if (
      !newAddr.name ||
      !newAddr.phone ||
      !newAddr.addressLine ||
      !newAddr.city ||
      !newAddr.state ||
      !newAddr.pincode
    ) {
      toast.error('Please fill in all required address fields');
      return;
    }

    setSavingAddr(true);
    try {
      const res = await addCustomerAddress(newAddr);
      setAddresses(res.data || []);
      toast.success('Address saved successfully');
      setDialogOpen(false);
      setNewAddr({
        name: '',
        phone: '',
        addressLine: '',
        city: '',
        state: '',
        pincode: '',
        country: 'India',
      });
    } catch (err) {
      toast.error(err.message || 'Unable to save address');
    } finally {
      setSavingAddr(false);
    }
  };

  const handleDeleteAddress = async (id) => {
    if (id === 'profile_default') {
      toast.info('Primary profile address cannot be deleted from here');
      return;
    }
    try {
      const res = await deleteCustomerAddress(id);
      setAddresses(res.data || []);
      toast.success('Address removed');
    } catch (err) {
      toast.error(err.message || 'Unable to delete address');
    }
  };

  return (
    <Box>
      <PageHeader
        title="Settings & Preferences"
        subtitle="Manage account security, password, and saved delivery addresses."
        breadcrumbs={[{ label: 'Portal', to: '/customer/dashboard' }, { label: 'Settings' }]}
      />

      <Paper variant="outlined" sx={{ mb: 3 }}>
        <Tabs value={tab} onChange={(_, val) => setTab(val)} sx={{ px: 2, pt: 1 }}>
          <Tab icon={<LockResetIcon fontSize="small" />} iconPosition="start" label="Security" />
          <Tab
            icon={<HomeOutlinedIcon fontSize="small" />}
            iconPosition="start"
            label="Saved Addresses"
          />
        </Tabs>
      </Paper>

      {/* Tab 0: Password / Security */}
      {tab === 0 && (
        <Paper variant="outlined" sx={{ p: 3, maxWidth: 520 }}>
          <Typography fontWeight={700} gutterBottom>
            Change Password
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Ensure your account is using a strong password with at least 8 characters, including
            uppercase, lowercase, and numbers.
          </Typography>
          <form onSubmit={handleSubmit(onPasswordSubmit)} noValidate>
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
                {isSubmitting ? <CircularProgress size={22} color="inherit" /> : 'Save Password'}
              </Button>
            </Stack>
          </form>
        </Paper>
      )}

      {/* Tab 1: Saved Addresses */}
      {tab === 1 && (
        <Stack spacing={2}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle1" fontWeight={700}>
              Saved Delivery Addresses ({addresses.length})
            </Typography>
            <Button
              variant="contained"
              size="small"
              startIcon={<AddLocationAltOutlinedIcon />}
              onClick={() => setDialogOpen(true)}
            >
              Add New Address
            </Button>
          </Stack>

          {loadingAddresses ? (
            <CircularProgress size={24} />
          ) : addresses.length === 0 ? (
            <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary" sx={{ mb: 2 }}>
                No saved addresses found. Add an address to speed up your checkout.
              </Typography>
              <Button variant="outlined" onClick={() => setDialogOpen(true)}>
                + Add Delivery Address
              </Button>
            </Paper>
          ) : (
            <Grid container spacing={2}>
              {addresses.map((addr) => (
                <Grid item xs={12} sm={6} key={addr._id}>
                  <Card variant="outlined" sx={{ height: '100%', position: 'relative' }}>
                    <CardContent>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                        <Box>
                          <Typography fontWeight={700}>{addr.name}</Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Phone: {addr.phone}
                          </Typography>
                          <Typography variant="body2" sx={{ mt: 1 }}>
                            {addr.addressLine}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {addr.city}, {addr.state} - {addr.pincode}
                          </Typography>
                        </Box>
                        {addr._id !== 'profile_default' && (
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteAddress(addr._id)}
                            aria-label="Delete address"
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Stack>
      )}

      {/* Add Address Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Add New Delivery Address</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ pt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Receiver / Contact Name"
                fullWidth
                size="small"
                required
                value={newAddr.name}
                onChange={(e) => setNewAddr((p) => ({ ...p, name: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Phone Number"
                fullWidth
                size="small"
                required
                value={newAddr.phone}
                onChange={(e) => setNewAddr((p) => ({ ...p, phone: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Street Address / Flat / Building"
                fullWidth
                size="small"
                required
                multiline
                minRows={2}
                value={newAddr.addressLine}
                onChange={(e) => setNewAddr((p) => ({ ...p, addressLine: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="City"
                fullWidth
                size="small"
                required
                value={newAddr.city}
                onChange={(e) => setNewAddr((p) => ({ ...p, city: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="State"
                fullWidth
                size="small"
                required
                value={newAddr.state}
                onChange={(e) => setNewAddr((p) => ({ ...p, state: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                label="Pincode"
                fullWidth
                size="small"
                required
                value={newAddr.pincode}
                onChange={(e) => setNewAddr((p) => ({ ...p, pincode: e.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={savingAddr} onClick={handleAddAddress}>
            {savingAddr ? <CircularProgress size={20} color="inherit" /> : 'Save Address'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
