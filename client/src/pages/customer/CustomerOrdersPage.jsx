import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import PageHeader from '../../components/PageHeader';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import ErrorState from '../../components/ErrorState';
import DataTable, { StatusChip } from '../../components/DataTable';
import { fetchCustomerOrders } from '../../services/customerPortalService';

function formatInr(value) {
  return `₹${Number(value || 0).toLocaleString('en-IN')}`;
}

export default function CustomerOrdersPage() {
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [orderStatus, setOrderStatus] = useState('');

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const res = await fetchCustomerOrders({
        page: page + 1,
        limit: rowsPerPage,
        search: search || undefined,
        status: orderStatus || undefined,
      });
      setRows(res.data.items || []);
      setTotal(res.data.pagination?.total || 0);
      setStatus('success');
    } catch (err) {
      setError(err);
      setStatus('error');
    }
  }, [page, rowsPerPage, search, orderStatus]);

  useEffect(() => {
    load();
  }, [load]);

  const columns = useMemo(
    () => [
      { id: 'orderNumber', label: 'Order #' },
      {
        id: 'orderDate',
        label: 'Date',
        render: (row) => (row.orderDate ? new Date(row.orderDate).toLocaleDateString() : '—'),
      },
      {
        id: 'items',
        label: 'Items',
        render: (row) => row.items?.length || 0,
      },
      {
        id: 'grandTotal',
        label: 'Total',
        render: (row) => formatInr(row.grandTotal),
      },
      {
        id: 'status',
        label: 'Order status',
        render: (row) => <StatusChip status={row.status} />,
      },
      {
        id: 'invoice',
        label: 'Invoice',
        render: (row) =>
          row.invoice?.invoiceNumber ? (
            <StatusChip status={row.invoice.paymentStatus || 'ISSUED'} />
          ) : (
            '—'
          ),
      },
      {
        id: 'actions',
        label: 'Actions',
        render: (row) => (
          <Tooltip title="View order">
            <IconButton
              size="small"
              component={RouterLink}
              to={`/customer/orders/${row._id}`}
              aria-label="View order"
            >
              <VisibilityOutlinedIcon fontSize="small" />
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
        title="My Orders"
        subtitle="Orders placed for your account."
        breadcrumbs={[{ label: 'Portal', to: '/customer/dashboard' }, { label: 'Orders' }]}
        actions={
          <Button startIcon={<VisibilityOutlinedIcon />} onClick={load} variant="outlined">
            Refresh
          </Button>
        }
      />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
        <TextField
          size="small"
          label="Search order #"
          value={search}
          onChange={(e) => {
            setPage(0);
            setSearch(e.target.value);
          }}
          fullWidth
        />
        <TextField
          size="small"
          select
          label="Status"
          value={orderStatus}
          onChange={(e) => {
            setPage(0);
            setOrderStatus(e.target.value);
          }}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">All</MenuItem>
          {['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map((s) => (
            <MenuItem key={s} value={s}>
              {s}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      {status === 'loading' && <LoadingSkeleton rows={5} />}
      {status === 'error' && <ErrorState title="Unable to load orders" message={error?.message} network={Boolean(error?.isNetworkError)} onRetry={load} />}
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
          emptyMessage="No orders found."
        />
      )}
    </Box>
  );
}
