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
import {
  createPurchaseOrder,
  deletePurchaseOrder,
  fetchPurchaseOrders,
  fetchSuppliers,
  transitionPurchaseOrder,
} from '../../services/partyService';
import { fetchProducts, fetchWarehouses } from '../../services/productService';

export default function PurchaseOrdersPage() {
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [statusFilter, setStatusFilter] = useState('');
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formError, setFormError] = useState(null);
  const [supplierId, setSupplierId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState([{ product: '', quantity: 1, unitPrice: 0 }]);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const [poRes, supRes, prodRes, whRes] = await Promise.all([
        fetchPurchaseOrders({
          page: page + 1,
          limit: rowsPerPage,
          status: statusFilter || undefined,
        }),
        fetchSuppliers({ limit: 100, status: 'ACTIVE' }),
        fetchProducts({ limit: 100, status: 'ACTIVE' }),
        fetchWarehouses({ limit: 50, isActive: true }),
      ]);
      setRows(poRes.data.items || []);
      setTotal(poRes.data.pagination?.total || 0);
      setSuppliers(supRes.data.items || []);
      setProducts(prodRes.data.items || []);
      setWarehouses(whRes.data.items || []);
      setStatus('success');
    } catch (err) {
      setError(err);
      setStatus('error');
    }
  }, [page, rowsPerPage, statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setFormError(null);
    setSupplierId('');
    setWarehouseId(warehouses.find((w) => w.isDefault)?._id || '');
    setNotes('');
    setLines([{ product: '', quantity: 1, unitPrice: 0 }]);
    setDialogOpen(true);
  };

  const updateLine = (index, patch) => {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  };

  const onProductPick = (index, productId) => {
    const product = products.find((p) => p._id === productId);
    updateLine(index, {
      product: productId,
      unitPrice: product?.purchasePrice || 0,
    });
  };

  const submitCreate = async () => {
    setFormError(null);
    try {
      if (!supplierId) throw new Error('Supplier is required');
      const items = lines
        .filter((l) => l.product && Number(l.quantity) > 0)
        .map((l) => ({
          product: l.product,
          quantity: Number(l.quantity),
          unitPrice: Number(l.unitPrice),
        }));
      if (!items.length) throw new Error('Add at least one product line');

      await createPurchaseOrder({
        supplier: supplierId,
        warehouse: warehouseId || null,
        notes,
        items,
      });
      toast.success('Purchase order created');
      setDialogOpen(false);
      load();
    } catch (err) {
      setFormError(err.message || 'Create failed');
    }
  };

  const changeStatus = async (row, next) => {
    try {
      await transitionPurchaseOrder(row._id, next);
      toast.success(`PO marked ${next}`);
      load();
    } catch (err) {
      toast.error(err.message || 'Status update failed');
    }
  };

  const columns = useMemo(
    () => [
      { id: 'orderNumber', label: 'PO #' },
      {
        id: 'supplier',
        label: 'Supplier',
        render: (r) => r.supplier?.name || '—',
      },
      {
        id: 'grandTotal',
        label: 'Total ₹',
        render: (r) => Number(r.grandTotal || 0).toLocaleString('en-IN'),
      },
      {
        id: 'status',
        label: 'Status',
        render: (r) => <StatusChip status={r.status} />,
      },
      {
        id: 'actions',
        label: 'Workflow',
        render: (row) => (
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
            {row.status === 'DRAFT' && (
              <Button size="small" onClick={() => changeStatus(row, 'PENDING')}>
                Submit
              </Button>
            )}
            {['DRAFT', 'PENDING'].includes(row.status) && (
              <Button size="small" variant="outlined" onClick={() => changeStatus(row, 'APPROVED')}>
                Approve
              </Button>
            )}
            {row.status === 'APPROVED' && (
              <Button size="small" onClick={() => changeStatus(row, 'ORDERED')}>
                Mark ordered
              </Button>
            )}
            {row.status === 'DRAFT' && (
              <Tooltip title="Delete draft">
                <IconButton size="small" color="error" onClick={() => setDeleteTarget(row)}>
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        ),
      },
    ],
    []
  );

  return (
    <Box>
      <PageHeader
        title="Purchase Orders"
        subtitle="Supplier → PO → approve → order → GRN."
        breadcrumbs={[{ label: 'Operations' }, { label: 'Purchase Orders' }]}
        actions={
          <Stack direction="row" spacing={1}>
            <Button startIcon={<RefreshIcon />} variant="outlined" onClick={load}>
              Refresh
            </Button>
            <Button startIcon={<AddIcon />} variant="contained" onClick={openCreate}>
              New PO
            </Button>
          </Stack>
        }
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
        sx={{ mb: 2, minWidth: 200 }}
      >
        <MenuItem value="">All</MenuItem>
        {['DRAFT', 'PENDING', 'APPROVED', 'ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'].map(
          (s) => (
            <MenuItem key={s} value={s}>
              {s}
            </MenuItem>
          )
        )}
      </TextField>

      {status === 'loading' && <LoadingSkeleton rows={4} />}
      {status === 'error' && (
        <ErrorState title="Unable to load purchase orders" message={error?.message} onRetry={load} network={Boolean(error?.isNetworkError)} />
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
          emptyMessage="No purchase orders yet."
        />
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Create purchase order</DialogTitle>
        <DialogContent>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                select
                label="Supplier"
                fullWidth
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                required
              >
                {suppliers.map((s) => (
                  <MenuItem key={s._id} value={s._id}>
                    {s.code} — {s.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Warehouse"
                fullWidth
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
              >
                <MenuItem value="">None</MenuItem>
                {warehouses.map((w) => (
                  <MenuItem key={w._id} value={w._id}>
                    {w.code} — {w.name}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>

            <Typography variant="subtitle2">Line items</Typography>
            {lines.map((line, index) => (
              <Stack key={index} direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                <TextField
                  select
                  label="Product"
                  fullWidth
                  value={line.product}
                  onChange={(e) => onProductPick(index, e.target.value)}
                >
                  {products.map((p) => (
                    <MenuItem key={p._id} value={p._id}>
                      {p.sku} — {p.name}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Qty"
                  type="number"
                  value={line.quantity}
                  onChange={(e) => updateLine(index, { quantity: e.target.value })}
                  sx={{ minWidth: 100 }}
                />
                <TextField
                  label="Unit ₹"
                  type="number"
                  value={line.unitPrice}
                  onChange={(e) => updateLine(index, { unitPrice: e.target.value })}
                  sx={{ minWidth: 120 }}
                />
                <Button
                  color="error"
                  disabled={lines.length === 1}
                  onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))}
                >
                  Remove
                </Button>
              </Stack>
            ))}
            <Button onClick={() => setLines((prev) => [...prev, { product: '', quantity: 1, unitPrice: 0 }])}>
              Add line
            </Button>
            <TextField label="Notes" fullWidth value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={submitCreate}>
            Create draft
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete purchase order"
        message={deleteTarget ? `Delete draft ${deleteTarget.orderNumber}?` : ''}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          try {
            await deletePurchaseOrder(deleteTarget._id);
            toast.success('PO deleted');
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
