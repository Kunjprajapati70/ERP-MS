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
  cancelLeaveRequest,
  createLeaveRequest,
  fetchEmployees,
  fetchLeaveRequests,
  reviewLeaveRequest,
} from '../../services/hrMfgService';

const LEAVE_TYPES = ['CASUAL', 'SICK', 'EARNED', 'UNPAID', 'OTHER'];

export default function LeavePage() {
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [employees, setEmployees] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formError, setFormError] = useState(null);
  const [employeeId, setEmployeeId] = useState('');
  const [leaveType, setLeaveType] = useState('CASUAL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const [leaveRes, empRes] = await Promise.all([
        fetchLeaveRequests({ page: page + 1, limit: rowsPerPage }),
        fetchEmployees({ limit: 100, status: 'ACTIVE' }),
      ]);
      setRows(leaveRes.data.items || []);
      setTotal(leaveRes.data.pagination?.total || 0);
      setEmployees(empRes.data.items || []);
      setStatus('success');
    } catch (err) {
      setError(err);
      setStatus('error');
    }
  }, [page, rowsPerPage]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async () => {
    setFormError(null);
    try {
      if (!employeeId || !startDate || !endDate) throw new Error('Employee and dates are required');
      await createLeaveRequest({
        employee: employeeId,
        leaveType,
        startDate,
        endDate,
        reason,
      });
      toast.success('Leave request submitted');
      setDialogOpen(false);
      load();
    } catch (err) {
      setFormError(err.message || 'Create failed');
    }
  };

  const columns = useMemo(
    () => [
      { id: 'requestNumber', label: 'Request #' },
      {
        id: 'employee',
        label: 'Employee',
        render: (r) =>
          r.employee ? `${r.employee.employeeCode} — ${r.employee.firstName} ${r.employee.lastName}` : '—',
      },
      { id: 'leaveType', label: 'Type', render: (r) => <StatusChip status={r.leaveType} /> },
      { id: 'days', label: 'Days' },
      {
        id: 'dates',
        label: 'Period',
        render: (r) =>
          `${r.startDate ? new Date(r.startDate).toLocaleDateString() : '—'} → ${
            r.endDate ? new Date(r.endDate).toLocaleDateString() : '—'
          }`,
      },
      { id: 'status', label: 'Status', render: (r) => <StatusChip status={r.status} /> },
      {
        id: 'actions',
        label: 'Review',
        render: (row) => (
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
            {row.status === 'PENDING' && (
              <>
                <Button
                  size="small"
                  color="success"
                  onClick={async () => {
                    try {
                      await reviewLeaveRequest(row._id, 'APPROVED');
                      toast.success('Leave approved');
                      load();
                    } catch (err) {
                      toast.error(err.message || 'Approve failed');
                    }
                  }}
                >
                  Approve
                </Button>
                <Button
                  size="small"
                  color="error"
                  onClick={async () => {
                    try {
                      await reviewLeaveRequest(row._id, 'REJECTED');
                      toast.success('Leave rejected');
                      load();
                    } catch (err) {
                      toast.error(err.message || 'Reject failed');
                    }
                  }}
                >
                  Reject
                </Button>
              </>
            )}
            {['PENDING', 'APPROVED'].includes(row.status) && (
              <Button
                size="small"
                onClick={async () => {
                  try {
                    await cancelLeaveRequest(row._id);
                    toast.success('Leave cancelled');
                    load();
                  } catch (err) {
                    toast.error(err.message || 'Cancel failed');
                  }
                }}
              >
                Cancel
              </Button>
            )}
          </Stack>
        ),
      },
    ],
    [load]
  );

  return (
    <Box>
      <PageHeader
        title="Leave Requests"
        subtitle="Submit and approve employee leave. Approved leave marks employee ON_LEAVE."
        breadcrumbs={[{ label: 'HR' }, { label: 'Leave' }]}
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
                setEmployeeId('');
                setLeaveType('CASUAL');
                setStartDate('');
                setEndDate('');
                setReason('');
                setDialogOpen(true);
              }}
            >
              New leave
            </Button>
          </Stack>
        }
      />

      {status === 'loading' && <LoadingSkeleton rows={4} />}
      {status === 'error' && (
        <ErrorState title="Unable to load leave" message={error?.message} onRetry={load} network={Boolean(error?.isNetworkError)} />
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
          emptyMessage="No leave requests yet."
        />
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>New leave request</DialogTitle>
        <DialogContent>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField select label="Employee" fullWidth required value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
              {employees.map((e) => (
                <MenuItem key={e._id} value={e._id}>
                  {e.employeeCode} — {e.firstName} {e.lastName}
                </MenuItem>
              ))}
            </TextField>
            <TextField select label="Type" fullWidth value={leaveType} onChange={(e) => setLeaveType(e.target.value)}>
              {LEAVE_TYPES.map((t) => (
                <MenuItem key={t} value={t}>
                  {t}
                </MenuItem>
              ))}
            </TextField>
            <Stack direction="row" spacing={2}>
              <TextField label="Start" type="date" fullWidth InputLabelProps={{ shrink: true }} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              <TextField label="End" type="date" fullWidth InputLabelProps={{ shrink: true }} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </Stack>
            <TextField label="Reason" fullWidth multiline minRows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={submit}>
            Submit
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
