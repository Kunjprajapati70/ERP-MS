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
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { toast } from 'react-toastify';
import PageHeader from '../../components/PageHeader';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import ErrorState from '../../components/ErrorState';
import DataTable, { StatusChip } from '../../components/DataTable';
import ConfirmDialog from '../../components/ConfirmDialog';
import {
  createWorkOrder,
  deleteWorkOrder,
  fetchBOMs,
  fetchWorkOrders,
  transitionWorkOrder,
} from '../../services/hrMfgService';
import { fetchWarehouses } from '../../services/productService';

export default function WorkOrdersPage() {
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [boms, setBoms] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formError, setFormError] = useState(null);
  const [bomId, setBomId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const [woRes, bomRes, whRes] = await Promise.all([
        fetchWorkOrders({ page: page + 1, limit: rowsPerPage }),
        fetchBOMs({ limit: 50, isActive: true }),
        fetchWarehouses({ limit: 50, isActive: true }),
      ]);
      setRows(woRes.data.items || []);
      setTotal(woRes.data.pagination?.total || 0);
      setBoms(bomRes.data.items || []);
      setWarehouses(whRes.data.items || []);
      setStatus('success');
    } catch (err) {
      setError(err);
      setStatus('error');
    }
  }, [page, rowsPerPage]);

  useEffect(() => {
    load();
  }, [load]);

  const changeStatus = async (row, next) => {
    try {
      await transitionWorkOrder(row._id, next);
      toast.success(`WO ${next}`);
      load();
    } catch (err) {
      toast.error(err.message || 'Status update failed');
    }
  };

  const submit = async () => {
    setFormError(null);
    try {
      if (!bomId) throw new Error('Select a BOM');
      await createWorkOrder({
        bom: bomId,
        warehouse: warehouseId || null,
        quantity: Number(quantity),
        notes,
      });
      toast.success('Work order created');
      setDialogOpen(false);
      load();
    } catch (err) {
      setFormError(err.message || 'Create failed');
    }
  };

  const columns = useMemo(
    () => [
      { id: 'workOrderNumber', label: 'WO #' },
      {
        id: 'bom',
        label: 'BOM',
        render: (r) => r.bom?.code || '—',
      },
      {
        id: 'finishedProduct',
        label: 'FG',
        render: (r) => r.finishedProduct?.sku || '—',
      },
      { id: 'quantity', label: 'Qty' },
      { id: 'status', label: 'Status', render: (r) => <StatusChip status={r.status} /> },
      {
        id: 'actions',
        label: 'Workflow',
        render: (row) => (
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
            {row.status === 'DRAFT' && (
              <Button size="small" variant="outlined" onClick={() => changeStatus(row, 'RELEASED')}>
                Release
              </Button>
            )}
            {row.status === 'RELEASED' && (
              <Button size="small" onClick={() => changeStatus(row, 'IN_PROGRESS')}>
                Start
              </Button>
            )}
            {['RELEASED', 'IN_PROGRESS'].includes(row.status) && (
              <Button size="small" color="success" variant="contained" onClick={() => changeStatus(row, 'COMPLETED')}>
                Complete (stock)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <Box>
      <PageHeader
        title="Work Orders"
        subtitle="Release → complete: components PRODUCTION_OUT, finished good PRODUCTION_IN."
        breadcrumbs={[{ label: 'Manufacturing' }, { label: 'Work Orders' }]}
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
                setBomId('');
                setWarehouseId(warehouses.find((w) => w.isDefault)?._id || '');
                setQuantity(1);
                setNotes('');
                setDialogOpen(true);
              }}
            >
              New WO
            </Button>
          </Stack>
        }
      />

      {status === 'loading' && <LoadingSkeleton rows={4} />}
      {status === 'error' && (
        <ErrorState title="Unable to load work orders" message={error?.message} onRetry={load} network={Boolean(error?.isNetworkError)} />
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
          emptyMessage="No work orders yet."
        />
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Create work order</DialogTitle>
        <DialogContent>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField select label="BOM" fullWidth required value={bomId} onChange={(e) => setBomId(e.target.value)}>
              {boms.map((b) => (
                <MenuItem key={b._id} value={b._id}>
                  {b.code} — {b.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField select label="Warehouse" fullWidth value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
              <MenuItem value="">None</MenuItem>
              {warehouses.map((w) => (
                <MenuItem key={w._id} value={w._id}>
                  {w.code} — {w.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField label="Quantity to produce" type="number" fullWidth value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            <TextField label="Notes" fullWidth value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={submit}>
            Create draft
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete work order"
        message={deleteTarget ? `Delete draft ${deleteTarget.workOrderNumber}?` : ''}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          try {
            await deleteWorkOrder(deleteTarget._id);
            toast.success('WO deleted');
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
