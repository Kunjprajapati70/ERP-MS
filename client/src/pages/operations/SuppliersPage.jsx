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
import {
  createSupplier,
  deleteSupplier,
  fetchSuppliers,
  updateSupplier,
} from '../../services/partyService';

const empty = {
  code: '',
  name: '',
  email: '',
  phone: '',
  contactPerson: '',
  city: '',
  paymentTerms: 'Net 30',
  status: 'ACTIVE',
};

export default function SuppliersPage() {
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formError, setFormError] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const { register, handleSubmit, reset } = useForm({ defaultValues: empty });

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const res = await fetchSuppliers({
        page: page + 1,
        limit: rowsPerPage,
        search: search || undefined,
      });
      setRows(res.data.items || []);
      setTotal(res.data.pagination?.total || 0);
      setStatus('success');
    } catch (err) {
      setError(err);
      setStatus('error');
    }
  }, [page, rowsPerPage, search]);

  useEffect(() => {
    load();
  }, [load]);

  const onSubmit = async (values) => {
    setFormError(null);
    try {
      if (editing) {
        await updateSupplier(editing._id, values);
        toast.success('Supplier updated');
      } else {
        await createSupplier(values);
        toast.success('Supplier created');
      }
      setDialogOpen(false);
      load();
    } catch (err) {
      setFormError(err.message || 'Save failed');
    }
  };

  const columns = useMemo(
    () => [
      { id: 'code', label: 'Code' },
      { id: 'name', label: 'Name' },
      { id: 'contactPerson', label: 'Contact', render: (r) => r.contactPerson || '—' },
      { id: 'email', label: 'Email', render: (r) => r.email || '—' },
      { id: 'phone', label: 'Phone', render: (r) => r.phone || '—' },
      { id: 'status', label: 'Status', render: (r) => <StatusChip status={r.status} /> },
      {
        id: 'actions',
        label: 'Actions',
        align: 'right',
        render: (row) => (
          <Stack direction="row" justifyContent="flex-end" spacing={0.5}>
            <Tooltip title="Edit">
              <IconButton
                size="small"
                onClick={() => {
                  setEditing(row);
                  reset(row);
                  setDialogOpen(true);
                }}
              >
                <EditOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton size="small" color="error" onClick={() => setDeleteTarget(row)}>
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        ),
      },
    ],
    [reset]
  );

  return (
    <Box>
      <PageHeader
        title="Suppliers"
        subtitle="Supplier master used by purchasing and GRN."
        breadcrumbs={[{ label: 'Operations' }, { label: 'Suppliers' }]}
        actions={
          <Stack direction="row" spacing={1}>
            <Button startIcon={<RefreshIcon />} variant="outlined" onClick={load}>
              Refresh
            </Button>
            <Button
              startIcon={<AddIcon />}
              variant="contained"
              onClick={() => {
                setEditing(null);
                reset(empty);
                setFormError(null);
                setDialogOpen(true);
              }}
            >
              Add supplier
            </Button>
          </Stack>
        }
      />

      <TextField
        size="small"
        label="Search"
        value={search}
        onChange={(e) => {
          setPage(0);
          setSearch(e.target.value);
        }}
        sx={{ mb: 2, maxWidth: 360 }}
        fullWidth
      />

      {status === 'loading' && <LoadingSkeleton rows={4} />}
      {status === 'error' && (
        <ErrorState title="Unable to load suppliers" message={error?.message} onRetry={load} network={Boolean(error?.isNetworkError)} />
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
          emptyMessage="No suppliers yet."
        />
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? 'Edit supplier' : 'Add supplier'}</DialogTitle>
        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            {formError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {formError}
              </Alert>
            )}
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField label="Code (optional)" fullWidth {...register('code')} />
              <TextField label="Name" fullWidth required {...register('name', { required: true })} />
              <TextField label="Contact person" fullWidth {...register('contactPerson')} />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField label="Email" fullWidth {...register('email')} />
                <TextField label="Phone" fullWidth {...register('phone')} />
              </Stack>
              <TextField label="City" fullWidth {...register('city')} />
              <TextField label="Payment terms" fullWidth {...register('paymentTerms')} />
              <TextField select label="Status" fullWidth defaultValue="ACTIVE" {...register('status')}>
                <MenuItem value="ACTIVE">Active</MenuItem>
                <MenuItem value="INACTIVE">Inactive</MenuItem>
              </TextField>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained">
              Save
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete supplier"
        message={deleteTarget ? `Delete ${deleteTarget.name}?` : ''}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          try {
            await deleteSupplier(deleteTarget._id);
            toast.success('Supplier deleted');
            setDeleteTarget(null);
            load();
          } catch (err) {
            toast.error(err.message || 'Delete failed');
          }
        }}
      />
    </Box>
  );
}
