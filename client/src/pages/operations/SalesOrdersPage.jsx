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
import { fetchCustomers } from '../../services/partyService';
import { fetchProducts, fetchWarehouses } from '../../services/productService';
import {
  createSalesOrder,
  deleteSalesOrder,
  fetchSalesOrders,
  transitionSalesOrder,
} from '../../services/salesService';

export default function SalesOrdersPage() {
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [statusFilter, setStatusFilter] = useState('');
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formError, setFormError] = useState(null);
  const [customerId, setCustomerId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState([{ product: '', quantity: 1, unitPrice: 0 }]);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const [soRes, custRes, prodRes, whRes] = await Promise.all([
        fetchSalesOrders({
          page: page + 1,
          limit: rowsPerPage,
          status: statusFilter || undefined,
        }),
        fetchCustomers({ limit: 100, status: 'ACTIVE' }),
        fetchProducts({ limit: 100, status: 'ACTIVE' }),
        fetchWarehouses({ limit: 50, isActive: true }),
      ]);
      setRows(soRes.data.items || []);
      setTotal(soRes.data.pagination?.total || 0);
      setCustomers(custRes.data.items || []);
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
    setCustomerId('');
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
      unitPrice: product?.sellingPrice || 0,
    });
  };

  const submitCreate = async () => {
    setFormError(null);
    try {
      if (!customerId) throw new Error('Customer is required');
      const items = lines
        .filter((l) => l.product && Number(l.quantity) > 0)
        .map((l) => ({
          product: l.product,
          quantity: Number(l.quantity),
          unitPrice: Number(l.unitPrice),
        }));
      if (!items.length) throw new Error('Add at least one product line');

      await createSalesOrder({
        customer: customerId,
        warehouse: warehouseId || null,
        notes,
        items,
      });
      toast.success('Sales order created');
      setDialogOpen(false);
      load();
    } catch (err) {
      setFormError(err.message || 'Create failed');
    }
  };

  const changeStatus = async (row, next) => {
    try {
      await transitionSalesOrder(row._id, next);
      toast.success(`SO marked ${next}`);
      load();
    } catch (err) {
      toast.error(err.message || 'Status update failed');
    }
  };

  const columns = useMemo(
    () => [
      { id: 'orderNumber', label: 'SO #' },
      {
        id: 'customer',
        label: 'Customer',
        render: (r) => r.customer?.name || '—',
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
        id: 'invoice',
        label: 'Invoice',
        render: (r) => r.invoice?.invoiceNumber || '—',
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
              <Button size="small" variant="outlined" color="primary" onClick={() => changeStatus(row, 'CONFIRMED')}>
                Confirm (stock out)
              </Button>
            )}
            {row.status === 'CONFIRMED' && (
              <Button size="small" onClick={() => changeStatus(row, 'PROCESSING')}>
                Process
              </Button>
            )}
            {['CONFIRMED', 'PROCESSING'].includes(row.status) && (
              <Button size="small" onClick={() => changeStatus(row, 'SHIPPED')}>
                Ship
              </Button>
            )}
            {row.status === 'SHIPPED' && (
              <Button size="small" onClick={() => changeStatus(row, 'DELIVERED')}>
                Deliver
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
        title="Sales Orders"
        subtitle="Customer → SO → confirm (stock SALE) → invoice."
        breadcrumbs={[{ label: 'Operations' }, { label: 'Sales Orders' }]}
        actions={
          <Stack direction="row" spacing={1}>
            <Button startIcon={<RefreshIcon />} variant="outlined" onClick={load}>
              Refresh
            </Button>
            <Button startIcon={<AddIcon />} variant="contained" onClick={openCreate}>
              New SO
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
        {['DRAFT', 'PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map((s) => (
          <MenuItem key={s} value={s}>
            {s}
          </MenuItem>
        ))}
      </TextField>

      {status === 'loading' && <LoadingSkeleton rows={4} />}
      {status === 'error' && (
        <ErrorState
          title="Unable to load sales orders"
          message={error?.message}
          onRetry={load}
          network={Boolean(error?.isNetworkError)}
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
          emptyMessage="No sales orders yet."
        />
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Create sales order</DialogTitle>
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
                label="Customer"
                fullWidth
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                required
              >
                {customers.map((c) => (
                  <MenuItem key={c._id} value={c._id}>
                    {c.code} — {c.name}
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
                      {p.sku} — {p.name} (stock {p.currentStock})
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
        title="Delete sales order"
        message={deleteTarget ? `Delete draft ${deleteTarget.orderNumber}?` : ''}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          try {
            await deleteSalesOrder(deleteTarget._id);
            toast.success('SO deleted');
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
