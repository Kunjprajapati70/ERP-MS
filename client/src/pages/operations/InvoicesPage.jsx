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
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import { toast } from 'react-toastify';
import PageHeader from '../../components/PageHeader';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import ErrorState from '../../components/ErrorState';
import DataTable, { StatusChip } from '../../components/DataTable';
import {
  createInvoiceFromSalesOrder,
  fetchInvoices,
  fetchSalesOrders,
} from '../../services/salesService';

export default function InvoicesPage() {
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [paymentFilter, setPaymentFilter] = useState('');
  const [eligibleSOs, setEligibleSOs] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formError, setFormError] = useState(null);
  const [salesOrderId, setSalesOrderId] = useState('');
  const [dueDays, setDueDays] = useState(15);
  const [notes, setNotes] = useState('');

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const [invRes, confirmed, processing, shipped, delivered] = await Promise.all([
        fetchInvoices({
          page: page + 1,
          limit: rowsPerPage,
          paymentStatus: paymentFilter || undefined,
        }),
        fetchSalesOrders({ status: 'CONFIRMED', limit: 50 }),
        fetchSalesOrders({ status: 'PROCESSING', limit: 50 }),
        fetchSalesOrders({ status: 'SHIPPED', limit: 50 }),
        fetchSalesOrders({ status: 'DELIVERED', limit: 50 }),
      ]);
      setRows(invRes.data.items || []);
      setTotal(invRes.data.pagination?.total || 0);
      const pooled = [
        ...(confirmed.data.items || []),
        ...(processing.data.items || []),
        ...(shipped.data.items || []),
        ...(delivered.data.items || []),
      ].filter((so) => !so.invoice);
      setEligibleSOs(pooled);
      setStatus('success');
    } catch (err) {
      setError(err);
      setStatus('error');
    }
  }, [page, rowsPerPage, paymentFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setFormError(null);
    setSalesOrderId('');
    setDueDays(15);
    setNotes('');
    setDialogOpen(true);
  };

  const submitCreate = async () => {
    setFormError(null);
    try {
      if (!salesOrderId) throw new Error('Select a sales order');
      await createInvoiceFromSalesOrder(salesOrderId, {
        dueDays: Number(dueDays) || 15,
        notes,
      });
      toast.success('Invoice created');
      setDialogOpen(false);
      load();
    } catch (err) {
      setFormError(err.message || 'Create failed');
    }
  };

  const columns = useMemo(
    () => [
      { id: 'invoiceNumber', label: 'Invoice #' },
      {
        id: 'customer',
        label: 'Customer',
        render: (r) => r.customer?.name || '—',
      },
      {
        id: 'salesOrder',
        label: 'SO',
        render: (r) => r.salesOrder?.orderNumber || '—',
      },
      {
        id: 'grandTotal',
        label: 'Total ₹',
        render: (r) => Number(r.grandTotal || 0).toLocaleString('en-IN'),
      },
      {
        id: 'balanceAmount',
        label: 'Balance ₹',
        render: (r) => Number(r.balanceAmount || 0).toLocaleString('en-IN'),
      },
      {
        id: 'paymentStatus',
        label: 'Payment',
        render: (r) => <StatusChip status={r.paymentStatus} />,
      },
      {
        id: 'status',
        label: 'Status',
        render: (r) => <StatusChip status={r.status} />,
      },
    ],
    []
  );

  return (
    <Box>
      <PageHeader
        title="Invoices"
        subtitle="Create invoices from confirmed sales orders."
        breadcrumbs={[{ label: 'Operations' }, { label: 'Invoices' }]}
        actions={
          <Stack direction="row" spacing={1}>
            <Button startIcon={<RefreshIcon />} variant="outlined" onClick={load}>
              Refresh
            </Button>
            <Button startIcon={<AddIcon />} variant="contained" onClick={openCreate}>
              From sales order
            </Button>
          </Stack>
        }
      />

      <TextField
        select
        size="small"
        label="Payment status"
        value={paymentFilter}
        onChange={(e) => {
          setPage(0);
          setPaymentFilter(e.target.value);
        }}
        sx={{ mb: 2, minWidth: 200 }}
      >
        <MenuItem value="">All</MenuItem>
        {['UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERDUE'].map((s) => (
          <MenuItem key={s} value={s}>
            {s}
          </MenuItem>
        ))}
      </TextField>

      {status === 'loading' && <LoadingSkeleton rows={4} />}
      {status === 'error' && (
        <ErrorState
          title="Unable to load invoices"
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
          emptyMessage="No invoices yet."
        />
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Invoice from sales order</DialogTitle>
        <DialogContent>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              select
              label="Sales order"
              fullWidth
              value={salesOrderId}
              onChange={(e) => setSalesOrderId(e.target.value)}
              required
              helperText={eligibleSOs.length ? undefined : 'No confirmed SOs without an invoice'}
            >
              {eligibleSOs.map((so) => (
                <MenuItem key={so._id} value={so._id}>
                  {so.orderNumber} — {so.customer?.name || 'Customer'} — ₹
                  {Number(so.grandTotal || 0).toLocaleString('en-IN')}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Due in (days)"
              type="number"
              value={dueDays}
              onChange={(e) => setDueDays(e.target.value)}
              fullWidth
            />
            <TextField label="Notes" fullWidth value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={submitCreate} disabled={!eligibleSOs.length}>
            Create invoice
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
