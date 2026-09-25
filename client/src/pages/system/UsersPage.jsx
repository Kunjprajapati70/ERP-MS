import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import PageHeader from '../../components/PageHeader';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import ErrorState from '../../components/ErrorState';
import DataTable, { StatusChip } from '../../components/DataTable';
import ConfirmDialog from '../../components/ConfirmDialog';
import PasswordField from '../../components/PasswordField';
import {
  createUser,
  deleteUser,
  fetchUsers,
  updateUser,
} from '../../services/userService';
import { fetchRoles } from '../../services/roleService';

const emptyForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  roleName: 'SALES_EXECUTIVE',
  status: 'ACTIVE',
  password: '',
};

export default function UsersPage() {
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [roles, setRoles] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: emptyForm,
    shouldUnregister: false,
  });

  const passwordRules = editing
    ? {
        validate: (value) => {
          if (!value) return true;
          if (value.length < 8) return 'Password must be at least 8 characters';
          if (!/[A-Z]/.test(value) || !/[a-z]/.test(value) || !/[0-9]/.test(value)) {
            return 'Password must include uppercase, lowercase, and a number';
          }
          return true;
        },
      }
    : {
        required: 'Password is required',
        minLength: { value: 8, message: 'Password must be at least 8 characters' },
        validate: (value) => {
          if (!/[A-Z]/.test(value) || !/[a-z]/.test(value) || !/[0-9]/.test(value)) {
            return 'Password must include uppercase, lowercase, and a number';
          }
          return true;
        },
      };

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const [usersRes, rolesRes] = await Promise.all([
        fetchUsers({
          page: page + 1,
          limit: rowsPerPage,
          search: search || undefined,
          status: statusFilter || undefined,
        }),
        fetchRoles({ limit: 50 }),
      ]);
      setRows(usersRes.data.items || []);
      setTotal(usersRes.data.pagination?.total || 0);
      setRoles(rolesRes.data.items || []);
      setStatus('success');
    } catch (err) {
      setError(err);
      setStatus('error');
    }
  }, [page, rowsPerPage, search, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setFormError(null);
    reset(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (user) => {
    setEditing(user);
    setFormError(null);
    reset({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone || '',
      roleName: user.role?.name || 'SALES_EXECUTIVE',
      status: user.status,
      password: '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (values) => {
    setSaving(true);
    setFormError(null);
    try {
      if (editing) {
        const payload = { ...values };
        if (!payload.password) delete payload.password;
        await updateUser(editing._id, payload);
        toast.success('User updated');
      } else {
        const result = await createUser(values);
        const emailed = result.data?.emailDelivery?.sent;
        if (emailed) {
          toast.success(result.message || 'User created and credentials emailed');
        } else {
          toast.success('User created');
          toast.warning(
            result.message ||
              'Credentials email was not sent. Add SMTP_HOST, SMTP_USER, SMTP_PASSWORD, and MAIL_FROM on Render, then restart the API.'
          );
        }
      }
      setDialogOpen(false);
      load();
    } catch (err) {
      const detailMsg = Array.isArray(err.details)
        ? err.details.map((d) => d.message || d.field).filter(Boolean).join('. ')
        : '';
      setFormError(detailMsg || err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteUser(deleteTarget._id);
      toast.success('User deleted');
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err.message || 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        id: 'name',
        label: 'Name',
        render: (row) => `${row.firstName} ${row.lastName}`,
      },
      { id: 'email', label: 'Email' },
      {
        id: 'role',
        label: 'Role',
        render: (row) => row.role?.displayName || row.role?.name || '—',
      },
      {
        id: 'status',
        label: 'Status',
        render: (row) => <StatusChip status={row.status} />,
      },
      {
        id: 'actions',
        label: 'Actions',
        align: 'right',
        render: (row) => (
          <Stack direction="row" spacing={0.5} justifyContent="flex-end">
            <Tooltip title="Edit">
              <IconButton size="small" onClick={() => openEdit(row)} aria-label="Edit user">
                <EditOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton
                size="small"
                color="error"
                onClick={() => setDeleteTarget(row)}
                aria-label="Delete user"
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        ),
      },
    ],
    []
  );

  return (
    <Box>
      <PageHeader
        title="Users"
        subtitle="Manage platform users and assign roles."
        breadcrumbs={[{ label: 'System' }, { label: 'Users' }]}
        actions={
          <Stack direction="row" spacing={1}>
            <Button startIcon={<RefreshIcon />} variant="outlined" onClick={load}>
              Refresh
            </Button>
            <Button startIcon={<AddIcon />} variant="contained" onClick={openCreate}>
              Add user
            </Button>
          </Stack>
        }
      />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField
          size="small"
          label="Search"
          value={search}
          onChange={(e) => {
            setPage(0);
            setSearch(e.target.value);
          }}
          fullWidth
        />
        <TextField
          select
          size="small"
          label="Status"
          value={statusFilter}
          onChange={(e) => {
            setPage(0);
            setStatusFilter(e.target.value);
          }}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="ACTIVE">Active</MenuItem>
          <MenuItem value="INACTIVE">Inactive</MenuItem>
          <MenuItem value="SUSPENDED">Suspended</MenuItem>
        </TextField>
      </Stack>

      {status === 'loading' && <LoadingSkeleton rows={5} />}
      {status === 'error' && (
        <ErrorState
          network={Boolean(error?.isNetworkError)}
          title="Unable to load users"
          message={error?.message}
          onRetry={load}
        />
      )}
      {status === 'success' && (
        <DataTable
          columns={columns}
          rows={rows}
          page={page}
          rowsPerPage={rowsPerPage}
          total={total}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          emptyMessage="No users found for this filter."
        />
      )}

      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? 'Edit user' : 'Add user'}</DialogTitle>
        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            {formError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {formError}
              </Alert>
            )}
            <Stack spacing={2} sx={{ pt: 1 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="First name"
                  fullWidth
                  {...register('firstName', { required: 'Required' })}
                  error={Boolean(errors.firstName)}
                  helperText={errors.firstName?.message}
                />
                <TextField
                  label="Last name"
                  fullWidth
                  {...register('lastName', { required: 'Required' })}
                  error={Boolean(errors.lastName)}
                  helperText={errors.lastName?.message}
                />
              </Stack>
              <TextField
                label="Email"
                type="email"
                fullWidth
                {...register('email', { required: 'Required' })}
                error={Boolean(errors.email)}
                helperText={errors.email?.message}
              />
              <TextField label="Phone" fullWidth {...register('phone')} />
              <TextField select label="Role" fullWidth defaultValue="SALES_EXECUTIVE" {...register('roleName')}>
                {roles.map((role) => (
                  <MenuItem key={role._id} value={role.name}>
                    {role.displayName || role.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField select label="Status" fullWidth defaultValue="ACTIVE" {...register('status')}>
                <MenuItem value="ACTIVE">Active</MenuItem>
                <MenuItem value="INACTIVE">Inactive</MenuItem>
                <MenuItem value="SUSPENDED">Suspended</MenuItem>
              </TextField>
              <PasswordField
                label={editing ? 'New password (optional)' : 'Password'}
                fullWidth
                autoComplete="new-password"
                {...register('password', passwordRules)}
                error={Boolean(errors.password)}
                helperText={
                  errors.password?.message ||
                  (editing
                    ? 'Leave blank to keep current password'
                    : 'Min 8 chars with uppercase, lowercase, and a number. Credentials will be emailed.')
                }
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete user"
        message={
          deleteTarget
            ? `Delete ${deleteTarget.firstName} ${deleteTarget.lastName} (${deleteTarget.email})? This cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        loading={deleting}
        onClose={() => !deleting && setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </Box>
  );
}
