import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';
import { toast } from 'react-toastify';
import PageHeader from '../../components/PageHeader';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import ErrorState from '../../components/ErrorState';
import DataTable, { StatusChip } from '../../components/DataTable';
import {
  checkOutAttendance,
  fetchAttendance,
  fetchEmployees,
  markAttendance,
} from '../../services/hrMfgService';
import { getBusinessDateKey } from '../../utils/attendanceDate';
import useBusinessDayRefresh from '../../hooks/useBusinessDayRefresh';

const STATUSES = ['PRESENT', 'ABSENT', 'HALF_DAY', 'LATE', 'ON_LEAVE', 'HOLIDAY'];

function todayISO() {
  return getBusinessDateKey();
}

function KpiCard({ title, value, hint, icon, color = 'primary' }) {
  return (
    <Card variant="outlined" sx={{ height: '100%', position: 'relative', overflow: 'hidden' }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
              {title}
            </Typography>
            <Typography variant="h5" fontWeight={700} sx={{ mt: 0.5, color: `${color}.main` }}>
              {value}
            </Typography>
            {hint && (
              <Typography variant="caption" color="text.secondary">
                {hint}
              </Typography>
            )}
          </Box>
          <Box
            sx={{
              p: 1,
              borderRadius: 2,
              bgcolor: (t) => `${t.palette[color]?.main || t.palette.primary.main}18`,
              color: `${color}.main`,
            }}
          >
            {icon}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function AttendancePage() {
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [dateFilter, setDateFilter] = useState(todayISO());
  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formError, setFormError] = useState(null);
  const [employeeId, setEmployeeId] = useState('');
  const [attStatus, setAttStatus] = useState('PRESENT');
  const [notes, setNotes] = useState('');

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const [attRes, empRes] = await Promise.all([
        fetchAttendance({
          page: page + 1,
          limit: rowsPerPage,
          date: dateFilter || undefined,
          employee: selectedEmployeeFilter || undefined,
        }),
        fetchEmployees({ limit: 100 }),
      ]);
      setRows(attRes.data.items || []);
      setTotal(attRes.data.pagination?.total || 0);
      setSummary(attRes.data.summary || null);
      setEmployees(
        (empRes.data.items || []).filter(
          (e) => ['ACTIVE', 'ON_LEAVE'].includes(e.status) && e.department !== 'ADMIN'
        )
      );
      setStatus('success');
    } catch (err) {
      setError(err);
      setStatus('error');
    }
  }, [page, rowsPerPage, dateFilter, selectedEmployeeFilter]);

  useEffect(() => {
    load();
    const handleGlobalUpdate = () => load();
    window.addEventListener('attendance-updated', handleGlobalUpdate);
    return () => window.removeEventListener('attendance-updated', handleGlobalUpdate);
  }, [load]);

  useBusinessDayRefresh((nextDate) => {
    setDateFilter(nextDate);
    setPage(0);
  });

  const submit = async () => {
    setFormError(null);
    try {
      if (!employeeId) throw new Error('Select an employee');
      await markAttendance({
        employee: employeeId,
        date: dateFilter || todayISO(),
        status: attStatus,
        notes,
      });
      toast.success('Attendance marked successfully');
      setDialogOpen(false);
      window.dispatchEvent(new CustomEvent('attendance-updated'));
      load();
    } catch (err) {
      setFormError(err.message || 'Mark failed');
    }
  };

  const columns = useMemo(
    () => [
      {
        id: 'date',
        label: 'Date',
        render: (r) => (r.date ? new Date(r.date).toLocaleDateString() : '—'),
      },
      {
        id: 'employee',
        label: 'Employee',
        render: (r) =>
          r.employee ? (
            <Box>
              <Typography variant="body2" fontWeight={600}>
                {r.employee.firstName} {r.employee.lastName}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {r.employee.employeeCode} {r.employee.department ? `• ${r.employee.department}` : ''}
              </Typography>
            </Box>
          ) : (
            '—'
          ),
      },
      { id: 'status', label: 'Status', render: (r) => <StatusChip status={r.status} /> },
      {
        id: 'checkIn',
        label: 'Check In',
        render: (r) =>
          r.checkIn ? (
            <Typography variant="body2" fontFamily="monospace">
              {new Date(r.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </Typography>
          ) : (
            '—'
          ),
      },
      {
        id: 'checkOut',
        label: 'Check Out',
        render: (r) =>
          r.checkOut ? (
            <Typography variant="body2" fontFamily="monospace">
              {new Date(r.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </Typography>
          ) : r.isCurrentlyWorking ? (
            <Chip
              label="Working Now"
              size="small"
              color="success"
              variant="outlined"
              sx={{ fontWeight: 600, fontSize: '0.75rem' }}
            />
          ) : (
            '—'
          ),
      },
      {
        id: 'workHours',
        label: 'Working Hours',
        render: (r) => {
          const hours = r.liveWorkHours ?? r.workHours ?? 0;
          const formatted = r.formattedWorkHours || `${hours} hrs`;
          return (
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="body2" fontWeight={600}>
                {hours} hrs
              </Typography>
              <Typography variant="caption" color="text.secondary">
                ({formatted})
              </Typography>
            </Stack>
          );
        },
      },
      {
        id: 'actions',
        label: 'Actions',
        render: (row) =>
          row.checkIn && !row.checkOut ? (
            <Button
              size="small"
              variant="outlined"
              color="error"
              onClick={async () => {
                try {
                  await checkOutAttendance(row._id);
                  toast.success('Employee checked out');
                  window.dispatchEvent(new CustomEvent('attendance-updated'));
                  load();
                } catch (err) {
                  toast.error(err.message || 'Checkout failed');
                }
              }}
            >
              Check Out
            </Button>
          ) : (
            <Typography variant="caption" color="text.secondary">
              Completed
            </Typography>
          ),
      },
    ],
    [load]
  );

  return (
    <Box>
      <PageHeader
        title="Attendance & Timing"
        subtitle="Track employee punches, accurate working hours, and real-time shifts."
        breadcrumbs={[{ label: 'HR', to: '/hr/employees' }, { label: 'Attendance' }]}
        actions={
          <Stack direction="row" spacing={1} alignItems="center">
            <Button startIcon={<RefreshIcon />} variant="outlined" onClick={load}>
              Refresh
            </Button>
            <Button
              startIcon={<AddIcon />}
              variant="contained"
              onClick={() => {
                setFormError(null);
                setEmployeeId('');
                setAttStatus('PRESENT');
                setNotes('');
                setDialogOpen(true);
              }}
            >
              Mark Attendance
            </Button>
          </Stack>
        }
      />

      {/* Admin KPI Summary Observation Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <KpiCard
            title="Present Today"
            value={summary?.presentCount ?? 0}
            hint={`Out of ${summary?.totalEmployees ?? employees.length} employees`}
            icon={<PeopleAltOutlinedIcon />}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <KpiCard
            title="Currently Working"
            value={summary?.currentlyWorkingCount ?? 0}
            hint="Active shifts on the clock"
            icon={<AccessTimeOutlinedIcon />}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <KpiCard
            title="Checked Out"
            value={summary?.checkedOutCount ?? 0}
            hint="Completed shifts today"
            icon={<CheckCircleOutlineIcon />}
            color="info"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <KpiCard
            title="Total Hours Logged"
            value={summary ? `${summary.totalWorkHours} hrs` : '0 hrs'}
            hint={summary?.formattedTotalHours || '0h 0m'}
            icon={<TimerOutlinedIcon />}
            color="warning"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <KpiCard
            title="Avg Hours / Staff"
            value={summary ? `${summary.avgWorkHours} hrs` : '0 hrs'}
            hint={summary?.formattedAvgHours || '0h 0m'}
            icon={<TimerOutlinedIcon />}
            color="secondary"
          />
        </Grid>
      </Grid>

      {/* Filters */}
      <Card variant="outlined" sx={{ mb: 2, p: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          <TextField
            type="date"
            size="small"
            label="Date"
            InputLabelProps={{ shrink: true }}
            value={dateFilter}
            onChange={(e) => {
              setPage(0);
              setDateFilter(e.target.value);
            }}
            sx={{ minWidth: 170 }}
          />

          <TextField
            select
            size="small"
            label="Filter by Employee"
            value={selectedEmployeeFilter}
            onChange={(e) => {
              setPage(0);
              setSelectedEmployeeFilter(e.target.value);
            }}
            sx={{ minWidth: 220 }}
          >
            <MenuItem value="">All Employees</MenuItem>
            {employees.map((e) => (
              <MenuItem key={e._id} value={e._id}>
                {e.employeeCode} — {e.firstName} {e.lastName}
              </MenuItem>
            ))}
          </TextField>

          {selectedEmployeeFilter && (
            <Button
              size="small"
              onClick={() => {
                setSelectedEmployeeFilter('');
                setPage(0);
              }}
            >
              Clear Filter
            </Button>
          )}
        </Stack>
      </Card>

      {status === 'loading' && <LoadingSkeleton rows={5} />}
      {status === 'error' && (
        <ErrorState
          title="Unable to load attendance"
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
          emptyMessage="No attendance records found for the selected date."
        />
      )}

      {/* Admin Manual Mark Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Mark Attendance</DialogTitle>
        <DialogContent>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              select
              label="Employee"
              fullWidth
              required
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
            >
              {employees.map((e) => (
                <MenuItem key={e._id} value={e._id}>
                  {e.employeeCode} — {e.firstName} {e.lastName} ({e.department})
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Status"
              fullWidth
              value={attStatus}
              onChange={(e) => setAttStatus(e.target.value)}
            >
              {STATUSES.map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Notes"
              fullWidth
              multiline
              minRows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={submit}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
