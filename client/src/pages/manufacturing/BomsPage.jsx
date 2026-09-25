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
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { toast } from 'react-toastify';
import PageHeader from '../../components/PageHeader';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import ErrorState from '../../components/ErrorState';
import DataTable, { StatusChip } from '../../components/DataTable';
import ConfirmDialog from '../../components/ConfirmDialog';
import { createBOM, deleteBOM, fetchBOMs } from '../../services/hrMfgService';
import { fetchProducts } from '../../services/productService';

export default function BomsPage() {
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [products, setProducts] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formError, setFormError] = useState(null);
  const [name, setName] = useState('');
  const [finishedProduct, setFinishedProduct] = useState('');
  const [components, setComponents] = useState([{ product: '', quantity: 1 }]);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const [bomRes, prodRes] = await Promise.all([
        fetchBOMs({ page: page + 1, limit: rowsPerPage }),
        fetchProducts({ limit: 100, status: 'ACTIVE' }),
      ]);
      setRows(bomRes.data.items || []);
      setTotal(bomRes.data.pagination?.total || 0);
      setProducts(prodRes.data.items || []);
      setStatus('success');
    } catch (err) {
      setError(err);
      setStatus('error');
    }
  }, [page, rowsPerPage]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    setFormError(null);
    try {
      if (!name || !finishedProduct) throw new Error('Name and finished product are required');
      const comps = components
        .filter((c) => c.product && Number(c.quantity) > 0)
        .map((c) => ({ product: c.product, quantity: Number(c.quantity) }));
      if (!comps.length) throw new Error('Add at least one component');
      await createBOM({ name, finishedProduct, components: comps });
      toast.success('BOM created');
      setDialogOpen(false);
      load();
    } catch (err) {
      setFormError(err.message || 'Create failed');
    }
  };

  const columns = useMemo(
    () => [
      { id: 'code', label: 'BOM #' },
      { id: 'name', label: 'Name' },
      {
        id: 'finishedProduct',
        label: 'Finished good',
        render: (r) => (r.finishedProduct ? `${r.finishedProduct.sku} — ${r.finishedProduct.name}` : '—'),
      },
      {
        id: 'components',
        label: 'Components',
        render: (r) => r.components?.length || 0,
      },
      {
        id: 'isActive',
        label: 'Active',
        render: (r) => <StatusChip status={r.isActive ? 'ACTIVE' : 'INACTIVE'} />,
      },
      {
        id: 'actions',
        label: '',
        render: (row) => (
          <Tooltip title="Delete">
            <IconButton size="small" color="error" onClick={() => setDeleteTarget(row)}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ),
      },
    ],
    []
  );

  return (
    <Box>
      <PageHeader
        title="Bills of Materials"
        subtitle="Define finished goods and component recipes for production."
        breadcrumbs={[{ label: 'Manufacturing' }, { label: 'BOMs' }]}
        actions={
          <Stack direction="row" spacing={1}>
            <Button startIcon={<RefreshIcon />} variant="outlined" onClick={load}>
              Refresh
            </Button>
            <Button
              startIcon={<AddIcon />}
              variant="contained"
              onClick={() => {
                setFormError(null);
                setName('');
                setFinishedProduct('');
                setComponents([{ product: '', quantity: 1 }]);
                setDialogOpen(true);
              }}
            >
              New BOM
            </Button>
          </Stack>
        }
      />

      {status === 'loading' && <LoadingSkeleton rows={4} />}
      {status === 'error' && (
        <ErrorState title="Unable to load BOMs" message={error?.message} onRetry={load} network={Boolean(error?.isNetworkError)} />
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
          emptyMessage="No BOMs yet."
        />
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Create BOM</DialogTitle>
        <DialogContent>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField label="Name" fullWidth required value={name} onChange={(e) => setName(e.target.value)} />
            <TextField select label="Finished product" fullWidth required value={finishedProduct} onChange={(e) => setFinishedProduct(e.target.value)}>
              {products.map((p) => (
                <MenuItem key={p._id} value={p._id}>
                  {p.sku} — {p.name}
                </MenuItem>
              ))}
            </TextField>
            <Typography variant="subtitle2">Components</Typography>
            {components.map((line, index) => (
              <Stack key={index} direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <TextField
                  select
                  label="Component"
                  fullWidth
                  value={line.product}
                  onChange={(e) =>
                    setComponents((prev) => prev.map((c, i) => (i === index ? { ...c, product: e.target.value } : c)))
                  }
                >
                  {products.map((p) => (
                    <MenuItem key={p._id} value={p._id}>
                      {p.sku} — {p.name} (stock {p.currentStock})
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Qty / FG"
                  type="number"
                  value={line.quantity}
                  onChange={(e) =>
                    setComponents((prev) => prev.map((c, i) => (i === index ? { ...c, quantity: e.target.value } : c)))
                  }
                  sx={{ minWidth: 120 }}
                />
                <Button
                  color="error"
                  disabled={components.length === 1}
                  onClick={() => setComponents((prev) => prev.filter((_, i) => i !== index))}
                >
                  Remove
                </Button>
              </Stack>
            ))}
            <Button onClick={() => setComponents((prev) => [...prev, { product: '', quantity: 1 }])}>Add component</Button>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={submit}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete BOM"
        message={deleteTarget ? `Delete ${deleteTarget.code}?` : ''}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          try {
            await deleteBOM(deleteTarget._id);
            toast.success('BOM deleted');
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
