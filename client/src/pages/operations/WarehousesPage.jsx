import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Stack,
  Switch,
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
import DataTable from '../../components/DataTable';
import ConfirmDialog from '../../components/ConfirmDialog';
import {
  createWarehouse,
  deleteWarehouse,
  fetchWarehouses,
  updateWarehouse,
} from '../../services/productService';

const emptyForm = { name: '', code: '', address: '', city: '', isDefault: false };

export default function WarehousesPage() {
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDefault, setIsDefault] = useState(false);

  const { register, handleSubmit, reset } = useForm({ defaultValues: emptyForm });

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const res = await fetchWarehouses({
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

  const openCreate = () => {
    setEditing(null);
    setFormError(null);
    setIsDefault(false);
    reset(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setFormError(null);
    setIsDefault(Boolean(row.isDefault));
    reset({
      name: row.name,
      code: row.code,
      address: row.address || '',
      city: row.city || '',
    });
    setDialogOpen(true);
  };

  const onSubmit = async (values) => {
    setSaving(true);
    setFormError(null);
    try {
      const payload = { ...values, isDefault };
      if (editing) {
        await updateWarehouse(editing._id, payload);
        toast.success('Warehouse updated');
      } else {
        await createWarehouse(payload);
        toast.success('Warehouse created');
      }
      setDialogOpen(false);
      load();
    } catch (err) {
      setFormError(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const columns = useMemo(
    () => [
      { id: 'code', label: 'Code' },
      { id: 'name', label: 'Name' },
      { id: 'city', label: 'City', render: (r) => r.city || '—' },
      {
        id: 'isDefault',
        label: 'Default',
        render: (r) => (r.isDefault ? 'Yes' : 'No'),
      },
      {
        id: 'actions',
        label: 'Actions',
        align: 'right',
        render: (row) => (
          <Stack direction="row" justifyContent="flex-end" spacing={0.5}>
            <Tooltip title="Edit">
              <IconButton size="small" onClick={() => openEdit(row)}>
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
    []
  );

  return (
    <Box>
      <PageHeader
        title="Warehouses"
        subtitle="Storage locations used by inventory and products."
        breadcrumbs={[{ label: 'Operations' }, { label: 'Warehouses' }]}
        actions={
          <Stack direction="row" spacing={1}>
            <Button startIcon={<RefreshIcon />} variant="outlined" onClick={load}>
              Refresh
            </Button>
            <Button startIcon={<AddIcon />} variant="contained" onClick={openCreate}>
              Add warehouse
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
        <ErrorState title="Unable to load warehouses" message={error?.message} onRetry={load} network={Boolean(error?.isNetworkError)} />
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
          emptyMessage="No warehouses yet."
        />
      )}

      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? 'Edit warehouse' : 'Add warehouse'}</DialogTitle>
        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            {formError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {formError}
              </Alert>
            )}
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField label="Name" fullWidth required {...register('name', { required: true })} />
              <TextField label="Code" fullWidth required {...register('code', { required: true })} />
              <TextField label="City" fullWidth {...register('city')} />
              <TextField label="Address" fullWidth {...register('address')} />
              <FormControlLabel
                control={<Switch checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />}
                label="Default warehouse"
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={saving}>
              Save
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete warehouse"
        message={deleteTarget ? `Delete warehouse ${deleteTarget.name}?` : ''}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          try {
            await deleteWarehouse(deleteTarget._id);
            toast.success('Warehouse deleted');
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
