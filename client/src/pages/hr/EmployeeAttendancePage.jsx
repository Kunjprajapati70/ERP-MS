import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import LoginRoundedIcon from '@mui/icons-material/LoginRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import { toast } from 'react-toastify';
import PageHeader from '../../components/PageHeader';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import ErrorState from '../../components/ErrorState';
import EmptyState from '../../components/EmptyState';
import DataTable from '../../components/DataTable';
import {
  fetchMyAttendanceHistory,
  fetchMyTodayAttendance,
  myCheckInAttendance,
  myCheckOutAttendance,
} from '../../services/hrMfgService';
import { formatBusinessDateLabel } from '../../utils/attendanceDate';
import useBusinessDayRefresh from '../../hooks/useBusinessDayRefresh';

function formatTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function statusMeta(punchState) {
  if (punchState === 'CHECKED_IN') {
    return { label: 'CHECKED IN', color: 'success' };
  }
  if (punchState === 'CHECKED_OUT') {
    return { label: 'CHECKED OUT', color: 'info' };
  }
  return { label: 'NOT CHECKED IN', color: 'warning' };
}

export default function EmployeeAttendancePage() {
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [today, setToday] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const [todayRes, historyRes] = await Promise.all([
        fetchMyTodayAttendance(),
        fetchMyAttendanceHistory({ page: page + 1, limit: rowsPerPage }),
      ]);
      setToday(todayRes.data);
      const paged = historyRes.data || {};
      setHistory(paged.items || []);
      setHistoryTotal(paged.pagination?.total || 0);
      setStatus('success');
    } catch (err) {
      setError(err);
      setStatus('error');
    }
  }, [page, rowsPerPage]);

  useEffect(() => {
    load();
  }, [load]);

  useBusinessDayRefresh(() => {
    load();
  });

  useEffect(() => {
    const refresh = () => load();
    window.addEventListener('attendance-updated', refresh);
    return () => window.removeEventListener('attendance-updated', refresh);
  }, [load]);

  const punchState = today?.punchState || (today?.isCheckedIn ? 'CHECKED_IN' : today?.hasCheckedOutToday ? 'CHECKED_OUT' : 'NOT_CHECKED_IN');
  const meta = statusMeta(punchState);
  const employee = today?.employee;
  const attendance = today?.attendance;
  const canCheckIn = today?.canCheckIn ?? punchState === 'NOT_CHECKED_IN';
  const canCheckOut = today?.canCheckOut ?? punchState === 'CHECKED_IN';

  const act = async (type) => {
    setActing(true);
    try {
      const res = type === 'in' ? await myCheckInAttendance() : await myCheckOutAttendance();
      setToday(res.data);
      toast.success(type === 'in' ? 'Checked in successfully' : 'Checked out successfully');
      window.dispatchEvent(new CustomEvent('attendance-updated'));
      await load();
    } catch (err) {
      toast.error(err.message || 'Attendance action failed');
    } finally {
      setActing(false);
    }
  };

  const historyRows = (Array.isArray(history) ? history : []).map((row) => ({
    _id: row._id,
    date: row.date ? new Date(row.date).toLocaleDateString() : '—',
    checkIn: formatTime(row.checkIn),
    checkOut: formatTime(row.checkOut),
    hours: row.formattedWorkHours || `${row.workHours || 0}h`,
    status: row.status,
  }));

  return (
    <Box>
      <PageHeader
        title="My Attendance"
        subtitle="Check in and out for your working day. Administrators are not required to record attendance."
        breadcrumbs={[{ label: 'HR' }, { label: 'My Attendance' }]}
        actions={
          <Button startIcon={<RefreshIcon />} variant="outlined" onClick={load} disabled={acting}>
            Refresh
          </Button>
        }
      />

      {status === 'loading' && !today && <LoadingSkeleton rows={4} />}
      {status === 'error' && !today && (
        <ErrorState
          title="Unable to load attendance"
          message={error?.message}
          onRetry={load}
          network={Boolean(error?.isNetworkError)}
        />
      )}

      {today && (
        <Stack spacing={3}>
          <Card variant="outlined">
            <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                justifyContent="space-between"
                spacing={2}
                alignItems={{ xs: 'flex-start', md: 'center' }}
              >
                <Box>
                  <Typography variant="overline" color="text.secondary">
                    {formatBusinessDateLabel()}
                  </Typography>
                  <Typography variant="h5" fontWeight={800}>
                    {employee ? `${employee.firstName} ${employee.lastName}` : 'Employee'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {[employee?.employeeCode, employee?.department, employee?.designation]
                      .filter(Boolean)
                      .join(' · ') || 'Daily attendance'}
                  </Typography>
                </Box>
                <Chip label={meta.label} color={meta.color} sx={{ fontWeight: 800, letterSpacing: 0.4 }} />
              </Stack>

              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} sm={4}>
                  <Typography variant="caption" color="text.secondary">
                    Check-in
                  </Typography>
                  <Typography fontWeight={700}>{formatTime(attendance?.checkIn)}</Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="caption" color="text.secondary">
                    Check-out
                  </Typography>
                  <Typography fontWeight={700}>{formatTime(attendance?.checkOut)}</Typography>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Typography variant="caption" color="text.secondary">
                    Working hours
                  </Typography>
                  <Typography fontWeight={700}>{today.formattedWorkHours || '0h 0m'}</Typography>
                </Grid>
              </Grid>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 3 }}>
                <Button
                  variant="contained"
                  color="success"
                  size="large"
                  startIcon={<LoginRoundedIcon />}
                  disabled={!canCheckIn || acting}
                  onClick={() => act('in')}
                >
                  Check In
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  size="large"
                  startIcon={<LogoutRoundedIcon />}
                  disabled={!canCheckOut || acting}
                  onClick={() => act('out')}
                >
                  Check Out
                </Button>
              </Stack>
              {punchState === 'CHECKED_OUT' && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  Shift complete. Duplicate check-in for today is not allowed.
                </Alert>
              )}
            </CardContent>
          </Card>

          {status === 'success' && historyRows.length === 0 ? (
            <EmptyState title="No attendance records" message="Your history will appear after your first check-in." />
          ) : (
            <DataTable
              columns={[
                { id: 'date', label: 'Date' },
                { id: 'checkIn', label: 'Check-in' },
                { id: 'checkOut', label: 'Check-out' },
                { id: 'hours', label: 'Working hours' },
                { id: 'status', label: 'Status' },
              ]}
              rows={historyRows}
              page={page}
              rowsPerPage={rowsPerPage}
              total={historyTotal || historyRows.length}
              onPageChange={(_, p) => setPage(p)}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              emptyMessage="No attendance records yet."
            />
          )}
        </Stack>
      )}
    </Box>
  );
}
