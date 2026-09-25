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
  createPayrollRun,
  fetchPayrollRun,
  fetchPayrollRuns,
  transitionPayroll,
} from '../../services/hrMfgService';

function formatInr(v) {
  return `₹${Number(v || 0).toLocaleString('en-IN')}`;
}

const now = new Date();

export default function PayrollPage() {
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formError, setFormError] = useState(null);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [detail, setDetail] = useState(null);

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const res = await fetchPayrollRuns({ page: page + 1, limit: rowsPerPage });
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

  const openDetail = async (id) => {
    try {
      const res = await fetchPayrollRun(id);
      setDetail(res.data.payroll);
    } catch (err) {
      toast.error(err.message || 'Unable to load payroll');
    }
  };

  const submit = async () => {
    setFormError(null);
    try {
      await createPayrollRun({ periodYear: Number(year), periodMonth: Number(month) });
      toast.success('Payroll run created from attendance');
      setDialogOpen(false);
      load();
    } catch (err) {
      setFormError(err.message || 'Create failed');
    }
  };

  const columns = useMemo(
    () => [
      { id: 'runNumber', label: 'Run #' },
      {
        id: 'period',
        label: 'Period',
        render: (r) => `${String(r.periodMonth).padStart(2, '0')}/${r.periodYear}`,
      },
      { id: 'totalNet', label: 'Net pay', render: (r) => formatInr(r.totalNet) },
      { id: 'status', label: 'Status', render: (r) => <StatusChip status={r.status} /> },
      {
        id: 'actions',
        label: 'Workflow',
        render: (row) => (
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
            <Button size="small" onClick={() => openDetail(row._id)}>
              Lines
            </Button>
            {row.status === 'DRAFT' && (
              <Button
                size="small"
                variant="outlined"
                onClick={async () => {
                  try {
                    await transitionPayroll(row._id, 'APPROVED');
                    toast.success('Approved');
                    load();
                  } catch (err) {
                    toast.error(err.message || 'Approve failed');
                  }
                }}
              >
                Approve
              </Button>
            )}
            {row.status === 'APPROVED' && (
              <Button
                size="small"
                color="success"
                variant="contained"
                onClick={async () => {
                  try {
                    await transitionPayroll(row._id, 'PAID');
                    toast.success('Marked paid');
                    load();
                  } catch (err) {
                    toast.error(err.message || 'Pay failed');
                  }
                }}
              >
                Mark paid
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
        title="Payroll"
        subtitle="Generate monthly payroll from employee salary + attendance."
        breadcrumbs={[{ label: 'HR' }, { label: 'Payroll' }]}
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
                setDialogOpen(true);
              }}
            >
              New run
            </Button>
          </Stack>
        }
      />

      {status === 'loading' && <LoadingSkeleton rows={4} />}
      {status === 'error' && (
        <ErrorState title="Unable to load payroll" message={error?.message} onRetry={load} network={Boolean(error?.isNetworkError)} />
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
          emptyMessage="No payroll runs yet."
        />
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Create payroll run</DialogTitle>
        <DialogContent>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField label="Year" type="number" fullWidth value={year} onChange={(e) => setYear(e.target.value)} />
            <TextField select label="Month" fullWidth value={month} onChange={(e) => setMonth(e.target.value)}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <MenuItem key={m} value={m}>
                  {m}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={submit}>
            Generate
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(detail)} onClose={() => setDetail(null)} fullWidth maxWidth="md">
        <DialogTitle>
          {detail?.runNumber} — {detail ? `${detail.periodMonth}/${detail.periodYear}` : ''}
        </DialogTitle>
        <DialogContent>
          {detail && (
            <Stack spacing={1} sx={{ pt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Net total {formatInr(detail.totalNet)} · Earnings {formatInr(detail.totalEarnings)} ·
                Deductions {formatInr(detail.totalDeductions)}
              </Typography>
              <DataTable
                columns={[
                  {
                    id: 'employee',
                    label: 'Employee',
                    render: (r) =>
                      r.employee
                        ? `${r.employee.employeeCode} — ${r.employee.firstName} ${r.employee.lastName}`
                        : '—',
                  },
                  { id: 'presentDays', label: 'Present' },
                  { id: 'absentDays', label: 'Absent' },
                  { id: 'netPay', label: 'Net', render: (r) => formatInr(r.netPay) },
                ]}
                rows={detail.lines || []}
                emptyMessage="No lines."
              />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetail(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
