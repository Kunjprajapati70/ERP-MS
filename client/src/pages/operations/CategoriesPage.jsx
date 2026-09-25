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
import DataTable from '../../components/DataTable';
import ConfirmDialog from '../../components/ConfirmDialog';
import {
  createCategory,
  deleteCategory,
  fetchCategories,
  updateCategory,
} from '../../services/productService';

export default function CategoriesPage() {
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

  const { register, handleSubmit, reset } = useForm({
    defaultValues: { name: '', code: '', description: '' },
  });

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const res = await fetchCategories({
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
    setSaving(true);
    setFormError(null);
    try {
      if (editing) {
        await updateCategory(editing._id, values);
        toast.success('Category updated');
      } else {
        await createCategory(values);
        toast.success('Category created');
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
      { id: 'code', label: 'Code', render: (r) => r.code || '—' },
      { id: 'name', label: 'Name' },
      { id: 'description', label: 'Description', render: (r) => r.description || '—' },
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
                  setFormError(null);
                  reset({
                    name: row.name,
                    code: row.code || '',
                    description: row.description || '',
                  });
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
        title="Categories"
        subtitle="Product category master data."
        breadcrumbs={[{ label: 'Operations' }, { label: 'Categories' }]}
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
                setFormError(null);
                reset({ name: '', code: '', description: '' });
                setDialogOpen(true);
              }}
            >
              Add category
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
        <ErrorState title="Unable to load categories" message={error?.message} onRetry={load} network={Boolean(error?.isNetworkError)} />
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
          emptyMessage="No categories yet."
        />
      )}

      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? 'Edit category' : 'Add category'}</DialogTitle>
        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            {formError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {formError}
              </Alert>
            )}
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField label="Name" fullWidth required {...register('name', { required: true })} />
              <TextField label="Code" fullWidth {...register('code')} />
              <TextField label="Description" fullWidth multiline minRows={2} {...register('description')} />
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
        title="Delete category"
        message={deleteTarget ? `Delete category ${deleteTarget.name}?` : ''}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          try {
            await deleteCategory(deleteTarget._id);
            toast.success('Category deleted');
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
