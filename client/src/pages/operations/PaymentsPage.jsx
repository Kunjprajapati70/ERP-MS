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
import { fetchInvoices, fetchPayments, recordPayment } from '../../services/salesService';

export default function PaymentsPage() {
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [openInvoices, setOpenInvoices] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formError, setFormError] = useState(null);
  const [invoiceId, setInvoiceId] = useState('');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('BANK_TRANSFER');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const [payRes, unpaid, partial] = await Promise.all([
        fetchPayments({ page: page + 1, limit: rowsPerPage }),
        fetchInvoices({ paymentStatus: 'UNPAID', limit: 50 }),
        fetchInvoices({ paymentStatus: 'PARTIALLY_PAID', limit: 50 }),
      ]);
      setRows(payRes.data.items || []);
      setTotal(payRes.data.pagination?.total || 0);
      setOpenInvoices([...(unpaid.data.items || []), ...(partial.data.items || [])]);
      setStatus('success');
    } catch (err) {
      setError(err);
      setStatus('error');
    }
  }, [page, rowsPerPage]);

  useEffect(() => {
    load();
  }, [load]);

  const selectedInvoice = openInvoices.find((inv) => inv._id === invoiceId);

  const openCreate = () => {
    setFormError(null);
    setInvoiceId('');
    setAmount('');
    setMethod('BANK_TRANSFER');
    setReferenceNumber('');
    setNotes('');
    setDialogOpen(true);
  };

  const onInvoicePick = (id) => {
    setInvoiceId(id);
    const inv = openInvoices.find((i) => i._id === id);
    if (inv) setAmount(String(inv.balanceAmount ?? inv.grandTotal ?? ''));
  };

  const submitCreate = async () => {
    setFormError(null);
    try {
      if (!invoiceId) throw new Error('Select an invoice');
      const amt = Number(amount);
      if (!amt || amt <= 0) throw new Error('Amount must be positive');
      await recordPayment({
        invoice: invoiceId,
        amount: amt,
        method,
        referenceNumber,
        notes,
      });
      toast.success('Payment recorded');
      setDialogOpen(false);
      load();
    } catch (err) {
      setFormError(err.message || 'Payment failed');
    }
  };

  const columns = useMemo(
    () => [
      { id: 'paymentNumber', label: 'Payment #' },
      {
        id: 'invoice',
        label: 'Invoice',
        render: (r) => r.invoice?.invoiceNumber || '—',
      },
      {
        id: 'customer',
        label: 'Customer',
        render: (r) => r.customer?.name || '—',
      },
      {
        id: 'amount',
        label: 'Amount ₹',
        render: (r) => Number(r.amount || 0).toLocaleString('en-IN'),
      },
      { id: 'method', label: 'Method', render: (r) => <StatusChip status={r.method} /> },
      {
        id: 'paymentDate',
        label: 'Date',
        render: (r) => (r.paymentDate ? new Date(r.paymentDate).toLocaleDateString() : '—'),
      },
    ],
    []
  );

  return (
    <Box>
      <PageHeader
        title="Payments"
        subtitle="Record payments against open invoices → PAID."
        breadcrumbs={[{ label: 'Operations' }, { label: 'Payments' }]}
        actions={
          <Stack direction="row" spacing={1}>
            <Button startIcon={<RefreshIcon />} variant="outlined" onClick={load}>
              Refresh
            </Button>
            <Button startIcon={<AddIcon />} variant="contained" onClick={openCreate}>
              Record payment
            </Button>
          </Stack>
        }
      />

      {status === 'loading' && <LoadingSkeleton rows={4} />}
      {status === 'error' && (
        <ErrorState
          title="Unable to load payments"
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
          emptyMessage="No payments yet."
        />
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Record payment</DialogTitle>
        <DialogContent>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              select
              label="Invoice"
              fullWidth
              value={invoiceId}
              onChange={(e) => onInvoicePick(e.target.value)}
              required
              helperText={
                selectedInvoice
                  ? `Balance: ₹${Number(selectedInvoice.balanceAmount || 0).toLocaleString('en-IN')}`
                  : openInvoices.length
                    ? undefined
                    : 'No unpaid invoices'
              }
            >
              {openInvoices.map((inv) => (
                <MenuItem key={inv._id} value={inv._id}>
                  {inv.invoiceNumber} — {inv.customer?.name || 'Customer'} — bal ₹
                  {Number(inv.balanceAmount || 0).toLocaleString('en-IN')}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Amount ₹"
              type="number"
              fullWidth
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <TextField select label="Method" fullWidth value={method} onChange={(e) => setMethod(e.target.value)}>
              {['CASH', 'BANK_TRANSFER', 'UPI', 'CHEQUE', 'CARD', 'OTHER'].map((m) => (
                <MenuItem key={m} value={m}>
                  {m}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Reference #"
              fullWidth
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
            />
            <TextField label="Notes" fullWidth value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={submitCreate} disabled={!openInvoices.length}>
            Save payment
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
