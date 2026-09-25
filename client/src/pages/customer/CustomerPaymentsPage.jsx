import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, TextField, Typography } from '@mui/material';
import PageHeader from '../../components/PageHeader';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import ErrorState from '../../components/ErrorState';
import DataTable, { StatusChip } from '../../components/DataTable';
import { fetchCustomerPayments } from '../../services/customerPortalService';

function formatInr(value) {
  return `₹${Number(value || 0).toLocaleString('en-IN')}`;
}

export default function CustomerPaymentsPage() {
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const res = await fetchCustomerPayments({
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

  const columns = useMemo(
    () => [
      { id: 'paymentNumber', label: 'Payment ID' },
      {
        id: 'invoice',
        label: 'Invoice',
        render: (row) => row.invoice?.invoiceNumber || '—',
      },
      {
        id: 'paymentDate',
        label: 'Date',
        render: (row) => (row.paymentDate ? new Date(row.paymentDate).toLocaleDateString() : '—'),
      },
      { id: 'amount', label: 'Amount', render: (row) => formatInr(row.amount) },
      { id: 'method', label: 'Method', render: (row) => row.method || row.paymentMethod || '—' },
      {
        id: 'reference',
        label: 'Reference',
        render: (row) => row.referenceNumber || row.transactionId || '—',
      },
      {
        id: 'status',
        label: 'Status',
        render: (row) => <StatusChip status={row.status || 'COMPLETED'} />,
      },
    ],
    []
  );

  return (
    <Box>
      <PageHeader
        title="My Payments"
        subtitle="Payment history for your invoices."
        breadcrumbs={[{ label: 'Portal', to: '/customer/dashboard' }, { label: 'Payments' }]}
      />
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Online checkout can be enabled when a payment gateway (e.g. Razorpay) is configured on the
        server. Secrets never ship to the browser.
      </Typography>
      <TextField
        size="small"
        label="Search payment / reference"
        value={search}
        onChange={(e) => {
          setPage(0);
          setSearch(e.target.value);
        }}
        sx={{ mb: 2, maxWidth: 360 }}
        fullWidth
      />
      {status === 'loading' && <LoadingSkeleton rows={5} />}
      {status === 'error' && (
        <ErrorState title="Unable to load payments" message={error?.message} network={Boolean(error?.isNetworkError)} onRetry={load} />
      )}
      {status === 'success' && (
        <DataTable
          columns={columns}
          rows={rows}
          total={total}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          emptyMessage="No payment history yet."
        />
      )}
    </Box>
  );
}
