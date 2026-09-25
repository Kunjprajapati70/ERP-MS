import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import { toast } from 'react-toastify';
import PageHeader from '../../components/PageHeader';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import ErrorState from '../../components/ErrorState';
import DataTable, { StatusChip } from '../../components/DataTable';
import {
  cancelGRN,
  confirmGRN,
  createGRN,
  fetchGRNs,
  fetchPurchaseOrder,
  fetchPurchaseOrders,
} from '../../services/partyService';

export default function GrnPage() {
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [eligiblePOs, setEligiblePOs] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formError, setFormError] = useState(null);
  const [poId, setPoId] = useState('');
  const [selectedPO, setSelectedPO] = useState(null);
  const [recvLines, setRecvLines] = useState([]);

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const [grnRes, poApproved, poOrdered, poPartial] = await Promise.all([
        fetchGRNs({ page: page + 1, limit: rowsPerPage }),
        fetchPurchaseOrders({ status: 'APPROVED', limit: 50 }),
        fetchPurchaseOrders({ status: 'ORDERED', limit: 50 }),
        fetchPurchaseOrders({ status: 'PARTIALLY_RECEIVED', limit: 50 }),
      ]);
      setRows(grnRes.data.items || []);
      setTotal(grnRes.data.pagination?.total || 0);
      setEligiblePOs([
        ...(poApproved.data.items || []),
        ...(poOrdered.data.items || []),
        ...(poPartial.data.items || []),
      ]);
      setStatus('success');
    } catch (err) {
      setError(err);
      setStatus('error');
    }
  }, [page, rowsPerPage]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setFormError(null);
    setPoId('');
    setSelectedPO(null);
    setRecvLines([]);
    setDialogOpen(true);
  };

  const onSelectPO = async (id) => {
    setPoId(id);
    setFormError(null);
    try {
      const res = await fetchPurchaseOrder(id);
      const po = res.data.purchaseOrder;
      setSelectedPO(po);
      setRecvLines(
        (po.items || []).map((item) => {
          const pending = item.quantity - (item.receivedQuantity || 0);
          return {
            purchaseOrderItemId: item._id,
            productLabel: item.product?.sku
              ? `${item.product.sku} — ${item.product.name}`
              : item.product,
            orderedQuantity: item.quantity,
            pending,
            receivedQuantity: pending > 0 ? pending : 0,
            rejectedQuantity: 0,
            damagedQuantity: 0,
          };
        })
      );
    } catch (err) {
      setFormError(err.message || 'Unable to load PO');
    }
  };

  const submitCreate = async () => {
    setFormError(null);
    try {
      if (!poId) throw new Error('Select a purchase order');
      const items = recvLines
        .filter((l) => Number(l.receivedQuantity) > 0)
        .map((l) => ({
          purchaseOrderItemId: l.purchaseOrderItemId,
          receivedQuantity: Number(l.receivedQuantity),
          rejectedQuantity: Number(l.rejectedQuantity || 0),
          damagedQuantity: Number(l.damagedQuantity || 0),
          acceptedQuantity: Math.max(
            0,
            Number(l.receivedQuantity) - Number(l.rejectedQuantity || 0) - Number(l.damagedQuantity || 0)
          ),
        }));
      if (!items.length) throw new Error('Enter received quantities');

      await createGRN({
        purchaseOrder: poId,
        warehouse: selectedPO?.warehouse?._id || selectedPO?.warehouse || null,
        items,
      });
      toast.success('GRN draft created');
      setDialogOpen(false);
      load();
    } catch (err) {
      setFormError(err.message || 'Create failed');
    }
  };

  const columns = useMemo(
    () => [
      { id: 'grnNumber', label: 'GRN #' },
      {
        id: 'po',
        label: 'PO',
        render: (r) => r.purchaseOrder?.orderNumber || '—',
      },
      {
        id: 'supplier',
        label: 'Supplier',
        render: (r) => r.supplier?.name || '—',
      },
      {
        id: 'status',
        label: 'Status',
        render: (r) => <StatusChip status={r.status} />,
      },
      {
        id: 'actions',
        label: 'Actions',
        render: (row) =>
          row.status === 'DRAFT' ? (
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                variant="contained"
                onClick={async () => {
                  try {
                    await confirmGRN(row._id);
                    toast.success('GRN confirmed — stock increased');
                    load();
                  } catch (err) {
                    toast.error(err.message || 'Confirm failed');
                  }
                }}
              >
                Confirm
              </Button>
              <Button
                size="small"
                color="inherit"
                onClick={async () => {
                  try {
                    await cancelGRN(row._id);
                    toast.info('GRN cancelled');
                    load();
                  } catch (err) {
                    toast.error(err.message || 'Cancel failed');
                  }
                }}
              >
                Cancel
              </Button>
            </Stack>
          ) : (
            '—'
          ),
      },
    ],
    [load]
  );

  return (
    <Box>
      <PageHeader
        title="Goods Receipt Notes"
        subtitle="Receive against POs. Confirming a GRN increases inventory by accepted qty only."
        breadcrumbs={[{ label: 'Operations' }, { label: 'GRN' }]}
        actions={
          <Stack direction="row" spacing={1}>
            <Button startIcon={<RefreshIcon />} variant="outlined" onClick={load}>
              Refresh
            </Button>
            <Button startIcon={<AddIcon />} variant="contained" onClick={openCreate}>
              New GRN
            </Button>
          </Stack>
        }
      />

      {status === 'loading' && <LoadingSkeleton rows={4} />}
      {status === 'error' && (
        <ErrorState title="Unable to load GRNs" message={error?.message} onRetry={load} network={Boolean(error?.isNetworkError)} />
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
          emptyMessage="No GRNs yet."
        />
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Create GRN from purchase order</DialogTitle>
        <DialogContent>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField select label="Purchase order" fullWidth value={poId} onChange={(e) => onSelectPO(e.target.value)}>
              {eligiblePOs.map((po) => (
                <MenuItem key={po._id} value={po._id}>
                  {po.orderNumber} — {po.supplier?.name} ({po.status})
                </MenuItem>
              ))}
            </TextField>

            {recvLines.map((line, index) => (
              <Box key={line.purchaseOrderItemId} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 2 }}>
                <Typography fontWeight={600} gutterBottom>
                  {line.productLabel}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Ordered {line.orderedQuantity} · Pending {line.pending}
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <TextField
                    label="Received"
                    type="number"
                    value={line.receivedQuantity}
                    onChange={(e) =>
                      setRecvLines((prev) =>
                        prev.map((l, i) => (i === index ? { ...l, receivedQuantity: e.target.value } : l))
                      )
                    }
                    fullWidth
                  />
                  <TextField
                    label="Rejected"
                    type="number"
                    value={line.rejectedQuantity}
                    onChange={(e) =>
                      setRecvLines((prev) =>
                        prev.map((l, i) => (i === index ? { ...l, rejectedQuantity: e.target.value } : l))
                      )
                    }
                    fullWidth
                  />
                  <TextField
                    label="Damaged"
                    type="number"
                    value={line.damagedQuantity}
                    onChange={(e) =>
                      setRecvLines((prev) =>
                        prev.map((l, i) => (i === index ? { ...l, damagedQuantity: e.target.value } : l))
                      )
                    }
                    fullWidth
                  />
                </Stack>
              </Box>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={submitCreate} disabled={!poId}>
            Create draft GRN
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
