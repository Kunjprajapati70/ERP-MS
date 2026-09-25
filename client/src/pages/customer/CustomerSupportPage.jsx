import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
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
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import PageHeader from '../../components/PageHeader';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import ErrorState from '../../components/ErrorState';
import DataTable, { StatusChip } from '../../components/DataTable';
import {
  createCustomerSupport,
  fetchCustomerSupport,
} from '../../services/customerPortalService';

const empty = {
  subject: '',
  category: 'OTHER',
  priority: 'MEDIUM',
  message: '',
  relatedOrderNumber: '',
};

export default function CustomerSupportPage() {
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState(null);
  const { register, handleSubmit, reset } = useForm({ defaultValues: empty });

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const res = await fetchCustomerSupport({ page: page + 1, limit: rowsPerPage });
      setRows(res.data.items || []);
      setTotal(res.data.pagination?.total || 0);
      setStatus('success');
    } catch (err) {
      setError(err);
      setStatus('error');
    }
  }, [page, rowsPerPage]);

  useEffect(() => {
    load();
  }, [load]);

  const onSubmit = async (values) => {
    setFormError(null);
    try {
      await createCustomerSupport(values);
      toast.success('Support request submitted');
      setOpen(false);
      reset(empty);
      load();
    } catch (err) {
      setFormError(err.message || 'Unable to create ticket');
    }
  };

  const columns = useMemo(
    () => [
      { id: 'ticketNumber', label: 'Ticket #' },
      { id: 'subject', label: 'Subject' },
      { id: 'category', label: 'Category' },
      { id: 'priority', label: 'Priority' },
      {
        id: 'status',
        label: 'Status',
        render: (row) => <StatusChip status={row.status} />,
      },
      {
        id: 'updatedAt',
        label: 'Updated',
        render: (row) => (row.updatedAt ? new Date(row.updatedAt).toLocaleString() : '—'),
      },
      {
        id: 'actions',
        label: 'Actions',
        render: (row) => (
          <Tooltip title="View">
            <IconButton
              size="small"
              component={RouterLink}
              to={`/customer/support/${row._id}`}
              aria-label="View ticket"
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
        title="Support / Inquiries"
        subtitle="Create and track support requests."
        breadcrumbs={[{ label: 'Portal', to: '/customer/dashboard' }, { label: 'Support' }]}
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
            New request
          </Button>
        }
      />

      {status === 'loading' && <LoadingSkeleton rows={5} />}
      {status === 'error' && (
        <ErrorState title="Unable to load support tickets" message={error?.message} network={Boolean(error?.isNetworkError)} onRetry={load} />
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
          emptyMessage="No support requests."
        />
      )}

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>New support request</DialogTitle>
        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            {formError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {formError}
              </Alert>
            )}
            <Stack spacing={2}>
              <TextField label="Subject" required fullWidth {...register('subject')} />
              <TextField select label="Category" fullWidth defaultValue="OTHER" {...register('category')}>
                {['ORDER', 'INVOICE', 'PAYMENT', 'PRODUCT', 'DELIVERY', 'TECHNICAL', 'OTHER'].map(
                  (c) => (
                    <MenuItem key={c} value={c}>
                      {c}
                    </MenuItem>
                  )
                )}
              </TextField>
              <TextField select label="Priority" fullWidth defaultValue="MEDIUM" {...register('priority')}>
                {['LOW', 'MEDIUM', 'HIGH'].map((p) => (
                  <MenuItem key={p} value={p}>
                    {p}
                  </MenuItem>
                ))}
              </TextField>
              <TextField label="Related order # (optional)" fullWidth {...register('relatedOrderNumber')} />
              <TextField
                label="Message"
                required
                fullWidth
                multiline
                minRows={4}
                {...register('message')}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained">
              Submit
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Box>
  );
}
