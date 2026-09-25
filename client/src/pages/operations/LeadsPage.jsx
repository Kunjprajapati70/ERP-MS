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
import TransformIcon from '@mui/icons-material/Transform';
import { toast } from 'react-toastify';
import PageHeader from '../../components/PageHeader';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import ErrorState from '../../components/ErrorState';
import DataTable, { StatusChip } from '../../components/DataTable';
import ConfirmDialog from '../../components/ConfirmDialog';
import {
  convertLead,
  createLead,
  deleteLead,
  fetchLeads,
  updateLead,
} from '../../services/analyticsService';

const SOURCES = ['WEBSITE', 'REFERRAL', 'COLD_CALL', 'EMAIL', 'EVENT', 'OTHER'];
const STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST'];

const emptyForm = {
  name: '',
  company: '',
  email: '',
  phone: '',
  source: 'WEBSITE',
  status: 'NEW',
  estimatedValue: 0,
  notes: '',
};

export default function LeadsPage() {
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [statusFilter, setStatusFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [convertTarget, setConvertTarget] = useState(null);

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const res = await fetchLeads({
        page: page + 1,
        limit: rowsPerPage,
        status: statusFilter || undefined,
      });
      setRows(res.data.items || []);
      setTotal(res.data.pagination?.total || 0);
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
    setForm(emptyForm);
    setFormError(null);
    setDialogOpen(true);
  };

  const submitCreate = async () => {
    setFormError(null);
    try {
      if (!form.name.trim()) throw new Error('Name is required');
      await createLead({
        ...form,
        estimatedValue: Number(form.estimatedValue) || 0,
      });
      toast.success('Lead created');
      setDialogOpen(false);
      load();
    } catch (err) {
      setFormError(err.message || 'Create failed');
    }
  };

  const changeStatus = async (row, next) => {
    try {
      await updateLead(row._id, { status: next });
      toast.success(`Lead marked ${next}`);
      load();
    } catch (err) {
      toast.error(err.message || 'Update failed');
    }
  };

  const columns = useMemo(
    () => [
      { id: 'code', label: 'Code' },
      { id: 'name', label: 'Name' },
      { id: 'company', label: 'Company', render: (r) => r.company || '—' },
      {
        id: 'estimatedValue',
        label: 'Value ₹',
        render: (r) => Number(r.estimatedValue || 0).toLocaleString('en-IN'),
      },
      {
        id: 'source',
        label: 'Source',
        render: (r) => <StatusChip status={r.source} />,
      },
      {
        id: 'status',
        label: 'Status',
        render: (r) => <StatusChip status={r.status} />,
      },
      {
        id: 'actions',
        label: 'Actions',
        render: (row) => (
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
            {row.status === 'NEW' && (
              <Button size="small" onClick={() => changeStatus(row, 'CONTACTED')}>
                Contact
              </Button>
            )}
            {['NEW', 'CONTACTED'].includes(row.status) && (
              <Button size="small" onClick={() => changeStatus(row, 'QUALIFIED')}>
                Qualify
              </Button>
            )}
            {['QUALIFIED', 'PROPOSAL'].includes(row.status) && (
              <Button size="small" onClick={() => changeStatus(row, 'PROPOSAL')}>
                Proposal
              </Button>
            )}
            {!['WON', 'LOST'].includes(row.status) && !row.convertedCustomer && (
              <Tooltip title="Convert to customer">
                <IconButton size="small" color="primary" onClick={() => setConvertTarget(row)}>
                  <TransformIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {!row.convertedCustomer && (
              <Tooltip title="Delete">
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
        title="CRM Leads"
        subtitle="Capture leads and convert won deals into customers."
        breadcrumbs={[{ label: 'CRM' }, { label: 'Leads' }]}
        actions={
          <Stack direction="row" spacing={1}>
            <Button startIcon={<RefreshIcon />} variant="outlined" onClick={load}>
              Refresh
            </Button>
            <Button startIcon={<AddIcon />} variant="contained" onClick={openCreate}>
              New lead
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
        {STATUSES.map((s) => (
          <MenuItem key={s} value={s}>
            {s}
          </MenuItem>
        ))}
      </TextField>

      {status === 'loading' && <LoadingSkeleton rows={4} />}
      {status === 'error' && (
        <ErrorState
          title="Unable to load leads"
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
          emptyMessage="No leads yet."
        />
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Create lead</DialogTitle>
        <DialogContent>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Name"
              required
              fullWidth
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <TextField
              label="Company"
              fullWidth
              value={form.company}
              onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Email"
                fullWidth
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
              <TextField
                label="Phone"
                fullWidth
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                select
                label="Source"
                fullWidth
                value={form.source}
                onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
              >
                {SOURCES.map((s) => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Estimated value ₹"
                type="number"
                fullWidth
                value={form.estimatedValue}
                onChange={(e) => setForm((f) => ({ ...f, estimatedValue: e.target.value }))}
              />
            </Stack>
            <TextField
              label="Notes"
              fullWidth
              multiline
              minRows={2}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={submitCreate}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete lead"
        message={deleteTarget ? `Delete ${deleteTarget.code} — ${deleteTarget.name}?` : ''}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          try {
            await deleteLead(deleteTarget._id);
            toast.success('Lead deleted');
            setDeleteTarget(null);
            load();
          } catch (err) {
            toast.error(err.message || 'Delete failed');
          }
        }}
      />

      <ConfirmDialog
        open={Boolean(convertTarget)}
        title="Convert to customer"
        message={
          convertTarget
            ? `Create customer from lead ${convertTarget.code} (${convertTarget.name}) and mark WON?`
            : ''
        }
        onClose={() => setConvertTarget(null)}
        onConfirm={async () => {
          try {
            await convertLead(convertTarget._id);
            toast.success('Lead converted to customer');
            setConvertTarget(null);
            load();
          } catch (err) {
            toast.error(err.message || 'Convert failed');
          }
        }}
      />
    </Box>
  );
}
