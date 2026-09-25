import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, IconButton, Stack, TextField, Tooltip } from '@mui/material';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import { toast } from 'react-toastify';
import PageHeader from '../../components/PageHeader';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import ErrorState from '../../components/ErrorState';
import DataTable, { StatusChip } from '../../components/DataTable';
import {
  downloadCustomerInvoicePdf,
  fetchCustomerInvoices,
} from '../../services/customerPortalService';

function formatInr(value) {
  return `₹${Number(value || 0).toLocaleString('en-IN')}`;
}

async function savePdfBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}

export default function CustomerInvoicesPage() {
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
      const res = await fetchCustomerInvoices({
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

  const handlePdf = async (row) => {
    try {
      const blob = await downloadCustomerInvoicePdf(row._id);
      await savePdfBlob(blob, `${row.invoiceNumber}.pdf`);
      toast.success('Invoice PDF downloaded');
    } catch (err) {
      toast.error(err.message || 'Unable to download PDF');
    }
  };

  const columns = useMemo(
    () => [
      { id: 'invoiceNumber', label: 'Invoice #' },
      {
        id: 'invoiceDate',
        label: 'Date',
        render: (row) => (row.invoiceDate ? new Date(row.invoiceDate).toLocaleDateString() : '—'),
      },
      {
        id: 'dueDate',
        label: 'Due',
        render: (row) => (row.dueDate ? new Date(row.dueDate).toLocaleDateString() : '—'),
      },
      { id: 'subtotal', label: 'Amount', render: (row) => formatInr(row.subtotal) },
      { id: 'taxTotal', label: 'Tax', render: (row) => formatInr(row.taxTotal) },
      { id: 'grandTotal', label: 'Total', render: (row) => formatInr(row.grandTotal) },
      {
        id: 'paymentStatus',
        label: 'Payment',
        render: (row) => <StatusChip status={row.paymentStatus} />,
      },
      {
        id: 'actions',
        label: 'Actions',
        render: (row) => (
          <Stack direction="row" spacing={0.5}>
            <Tooltip title="View">
              <IconButton
                size="small"
                component={RouterLink}
                to={`/customer/invoices/${row._id}`}
                aria-label="View invoice"
              >
                <VisibilityOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Download PDF">
              <IconButton size="small" onClick={() => handlePdf(row)} aria-label="Download PDF">
                <PictureAsPdfOutlinedIcon fontSize="small" />
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
        title="My Invoices"
        subtitle="Invoices issued to your account."
        breadcrumbs={[{ label: 'Portal', to: '/customer/dashboard' }, { label: 'Invoices' }]}
      />
      <TextField
        size="small"
        label="Search invoice #"
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
        <ErrorState title="Unable to load invoices" message={error?.message} network={Boolean(error?.isNetworkError)} onRetry={load} />
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
          emptyMessage="No invoices available."
        />
      )}
    </Box>
  );
}
