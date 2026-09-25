import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useTheme,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import BarChartRoundedIcon from '@mui/icons-material/BarChartRounded';
import ShowChartRoundedIcon from '@mui/icons-material/ShowChartRounded';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Area,
  AreaChart,
} from 'recharts';
import PageHeader from '../components/PageHeader';
import LoadingSkeleton from '../components/LoadingSkeleton';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import AttendancePunchWidget from '../components/AttendancePunchWidget';
import { fetchDashboardOverview, fetchSalesTrend } from '../services/analyticsService';
import {
  fetchMyAttendanceHistory,
  fetchMyTodayAttendance,
} from '../services/hrMfgService';
import { isAdminUser, isAttendanceEligible } from '../utils/permissions';
import { formatBusinessDateLabel } from '../utils/attendanceDate';
import useBusinessDayRefresh from '../hooks/useBusinessDayRefresh';

const VIBRANT_BAR_COLORS = [
  '#2563EB', // Vivid Blue
  '#059669', // Emerald Green
  '#D97706', // Amber Gold
  '#DC2626', // Crimson Red
  '#7C3AED', // Purple
  '#DB2777', // Magenta Pink
  '#0891B2', // Cyan
  '#EA580C', // Bright Orange
  '#4F46E5', // Indigo
  '#65A30D', // Lime Green
  '#0D9488', // Teal
  '#9333EA', // Violet
  '#E11D48', // Rose
  '#0284C7', // Sky Blue
];

function formatInr(value) {
  return `₹${Number(value || 0).toLocaleString('en-IN')}`;
}

function KpiCard({ label, value, hint }) {
  return (
    <Card
      variant="outlined"
      sx={{
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 4,
          background: (t) =>
            `linear-gradient(180deg, ${t.palette.primary.main}, ${t.palette.info.main})`,
        },
      }}
    >
      <CardContent sx={{ pl: 2.5 }}>
        <Typography variant="overline" color="text.secondary">
          {label}
        </Typography>
        <Typography
          variant="h5"
          fontWeight={700}
          sx={{ mt: 0.5, fontSize: { xs: '1.25rem', sm: '1.45rem' }, wordBreak: 'break-word' }}
        >
          {value}
        </Typography>
        {hint && (
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
            {hint}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const theme = useTheme();
  const user = useSelector((state) => state.auth.user);
  const adminView = isAdminUser(user);
  const employeeView = isAttendanceEligible(user);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [overview, setOverview] = useState(null);
  const [trend, setTrend] = useState([]);
  const [chartType, setChartType] = useState('bar');
  const [myToday, setMyToday] = useState(null);
  const [myHistory, setMyHistory] = useState([]);

  const load = useCallback(async (opts = {}) => {
    const silent = Boolean(opts.silent);
    if (!silent) {
      setStatus('loading');
      setError(null);
    }
    try {
      const [ov, tr] = await Promise.all([fetchDashboardOverview(), fetchSalesTrend(14)]);
      setOverview(ov.data);
      setTrend(tr.data.series || []);
      if (employeeView) {
        try {
          const [todayRes, histRes] = await Promise.all([
            fetchMyTodayAttendance(),
            fetchMyAttendanceHistory({ page: 1, limit: 5 }),
          ]);
          setMyToday(todayRes.data);
          setMyHistory(histRes.data?.items || []);
        } catch {
          setMyToday(null);
          setMyHistory([]);
        }
      } else {
        setMyToday(null);
        setMyHistory([]);
      }
      setStatus('success');
    } catch (err) {
      if (!silent) {
        setError(err);
        setStatus('error');
      }
    }
  }, [employeeView]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const id = setInterval(() => load({ silent: true }), 30000);
    return () => clearInterval(id);
  }, [load]);

  useBusinessDayRefresh(() => {
    load({ silent: true });
  }, employeeView);

  const kpis = overview?.kpis;

  return (
    <Box>
      <PageHeader
        title={employeeView && !adminView ? 'Employee Dashboard' : 'Dashboard'}
        subtitle={
          employeeView && !adminView
            ? 'Your attendance, working hours, and operational snapshot.'
            : 'Live KPIs from sales, inventory, receivables, HR attendance, and CRM — auto-refreshes every 30s.'
        }
        breadcrumbs={[{ label: 'Overview' }, { label: 'Dashboard' }]}
        actions={
          <Stack direction="row" spacing={1} alignItems="center">
            {employeeView ? <AttendancePunchWidget /> : null}
            <Button startIcon={<RefreshIcon />} variant="outlined" onClick={() => load()}>
              Refresh
            </Button>
          </Stack>
        }
      />

      {status === 'loading' && !overview && <LoadingSkeleton rows={5} />}
      {status === 'error' && !overview && (
        <ErrorState
          title="Unable to load dashboard"
          message={error?.message}
          onRetry={() => load()}
          network={Boolean(error?.isNetworkError)}
        />
      )}

      {overview && kpis && (
        <Stack spacing={3}>
          {employeeView && myToday && (
            <Card variant="outlined">
              <CardContent>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  justifyContent="space-between"
                  spacing={2}
                >
                  <Box>
                    <Typography variant="overline" color="text.secondary">
                      {formatBusinessDateLabel()}
                    </Typography>
                    <Typography variant="h5" fontWeight={800}>
                      {user?.firstName} {user?.lastName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {[myToday.employee?.department, myToday.employee?.designation]
                        .filter(Boolean)
                        .join(' · ') || user?.role?.displayName}
                    </Typography>
                  </Box>
                  <Chip
                    label={
                      myToday.punchState === 'CHECKED_IN'
                        ? 'CHECKED IN'
                        : myToday.punchState === 'CHECKED_OUT'
                          ? 'CHECKED OUT'
                          : 'NOT CHECKED IN'
                    }
                    color={
                      myToday.punchState === 'CHECKED_IN'
                        ? 'success'
                        : myToday.punchState === 'CHECKED_OUT'
                          ? 'info'
                          : 'warning'
                    }
                    sx={{ fontWeight: 800, alignSelf: 'flex-start' }}
                  />
                </Stack>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" color="text.secondary">
                      Check-in
                    </Typography>
                    <Typography fontWeight={700}>
                      {myToday.attendance?.checkIn
                        ? new Date(myToday.attendance.checkIn).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" color="text.secondary">
                      Check-out
                    </Typography>
                    <Typography fontWeight={700}>
                      {myToday.attendance?.checkOut
                        ? new Date(myToday.attendance.checkOut).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" color="text.secondary">
                      Working hours
                    </Typography>
                    <Typography fontWeight={700}>{myToday.formattedWorkHours || '0h 0m'}</Typography>
                  </Grid>
                </Grid>
                {myHistory.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      Recent attendance
                    </Typography>
                    <Stack spacing={0.75}>
                      {myHistory.map((row) => (
                        <Stack key={row._id} direction="row" justifyContent="space-between">
                          <Typography variant="body2">
                            {row.date ? new Date(row.date).toLocaleDateString() : '—'} · {row.status}
                          </Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {row.formattedWorkHours || '0h 0m'}
                          </Typography>
                        </Stack>
                      ))}
                    </Stack>
                  </Box>
                )}
              </CardContent>
            </Card>
          )}

          {adminView && overview.employeeAttendance && (
            <>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={4} lg={2}>
                  <KpiCard
                    label="Total employees"
                    value={overview.employeeAttendance.totalEmployees}
                    hint="Excludes administrators"
                  />
                </Grid>
                <Grid item xs={12} sm={6} md={4} lg={2}>
                  <KpiCard label="Present today" value={overview.employeeAttendance.presentToday} />
                </Grid>
                <Grid item xs={12} sm={6} md={4} lg={2}>
                  <KpiCard label="Checked in" value={overview.employeeAttendance.checkedIn} />
                </Grid>
                <Grid item xs={12} sm={6} md={4} lg={2}>
                  <KpiCard label="Checked out" value={overview.employeeAttendance.checkedOut} />
                </Grid>
                <Grid item xs={12} sm={6} md={4} lg={2}>
                  <KpiCard label="Absent" value={overview.employeeAttendance.absent} />
                </Grid>
                <Grid item xs={12} sm={6} md={4} lg={2}>
                  <KpiCard
                    label="Attendance %"
                    value={`${overview.employeeAttendance.attendancePercentage}%`}
                    hint="Present ÷ total employees"
                  />
                </Grid>
              </Grid>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Card variant="outlined" sx={{ height: '100%' }}>
                    <CardContent>
                      <Typography variant="h6" fontWeight={700}>
                        Employee attendance today
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                        X-axis: attendance category · Y-axis: number of employees
                      </Typography>
                      <Box sx={{ width: '100%', height: 260 }}>
                        {(overview.employeeAttendance.breakdown || []).every((d) => d.count === 0) ? (
                          <EmptyState
                            title="No employee attendance yet"
                            message="Employee check-ins will appear here. Admin accounts are never counted."
                          />
                        ) : (
                          <ResponsiveContainer>
                            <BarChart
                              data={overview.employeeAttendance.breakdown}
                              margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                              <XAxis dataKey="label" tick={{ fontSize: 11 }} label={{ value: 'Category', position: 'insideBottom', offset: -2, fontSize: 11 }} />
                              <YAxis
                                allowDecimals={false}
                                tick={{ fontSize: 11 }}
                                label={{ value: 'Employees', angle: -90, position: 'insideLeft', fontSize: 11 }}
                              />
                              <Tooltip />
                              <Legend />
                              <Bar dataKey="count" name="Employees" radius={[6, 6, 0, 0]} fill={theme.palette.primary.main} />
                            </BarChart>
                          </ResponsiveContainer>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card variant="outlined" sx={{ height: '100%' }}>
                    <CardContent>
                      <Typography variant="h6" fontWeight={700} gutterBottom>
                        Recent employee activity
                      </Typography>
                      <Stack spacing={1.25}>
                        {(overview.employeeAttendance.recentActivity || []).length === 0 && (
                          <Typography color="text.secondary">No recent employee punches.</Typography>
                        )}
                        {(overview.employeeAttendance.recentActivity || []).map((row) => (
                          <Stack key={row.id} direction="row" justifyContent="space-between" spacing={2}>
                            <Box>
                              <Typography fontWeight={600}>{row.employeeName}</Typography>
                              <Typography variant="body2" color="text.secondary">
                                {row.employeeCode} · {row.status}
                              </Typography>
                            </Box>
                            <Typography fontWeight={600}>{row.formattedWorkHours}</Typography>
                          </Stack>
                        ))}
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </>
          )}

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <KpiCard label="Sales (30d)" value={formatInr(kpis.salesRevenue30)} hint={`${kpis.salesOrders30} confirmed orders`} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KpiCard label="Collected (30d)" value={formatInr(kpis.paymentsCollected30)} hint={`${kpis.paymentsCount30} payments`} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KpiCard label="Receivables" value={formatInr(kpis.receivablesTotal)} hint={`${kpis.openInvoices} open · ${kpis.overdueInvoices} overdue`} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KpiCard label="Low stock" value={kpis.lowStockProducts} hint={`${kpis.activeCustomers} active customers`} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KpiCard label="Open sales orders" value={kpis.openSalesOrders} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KpiCard label="Open POs" value={kpis.openPurchaseOrders} hint={`${kpis.draftGrns} draft GRNs`} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KpiCard label="Open leads" value={kpis.openLeads} />
            </Grid>
          </Grid>

          <Card variant="outlined">
            <CardContent>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'flex-start', sm: 'center' }}
                spacing={1}
                sx={{ mb: 2 }}
              >
                <Box>
                  <Typography variant="h6" fontWeight={700}>
                    Confirmed sales — last 14 days
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Daily revenue breakdown with live status updates
                  </Typography>
                </Box>
                <ToggleButtonGroup
                  size="small"
                  value={chartType}
                  exclusive
                  onChange={(_, val) => val && setChartType(val)}
                  aria-label="chart type"
                >
                  <ToggleButton
                    value="bar"
                    aria-label="bar chart"
                    sx={{ px: 1.5, py: 0.5, gap: 0.5, fontSize: '0.75rem', fontWeight: 700 }}
                  >
                    <BarChartRoundedIcon sx={{ fontSize: 18 }} /> Colorful Bar
                  </ToggleButton>
                  <ToggleButton
                    value="area"
                    aria-label="area chart"
                    sx={{ px: 1.5, py: 0.5, gap: 0.5, fontSize: '0.75rem', fontWeight: 700 }}
                  >
                    <ShowChartRoundedIcon sx={{ fontSize: 18 }} /> Area Trend
                  </ToggleButton>
                </ToggleButtonGroup>
              </Stack>

              <Box sx={{ width: '100%', height: 280 }}>
                <ResponsiveContainer>
                  {chartType === 'bar' ? (
                    <BarChart data={trend} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11 }}
                        label={{ value: 'Date', position: 'insideBottom', offset: -2, fontSize: 11 }}
                      />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                        label={{ value: 'Revenue (INR)', angle: -90, position: 'insideLeft', fontSize: 11 }}
                      />
                      <Tooltip formatter={(v) => formatInr(v)} />
                      <Legend />
                      <Bar dataKey="revenue" name="Daily Revenue" radius={[6, 6, 0, 0]}>
                        {trend.map((_, index) => (
                          <Cell
                            key={`dash-bar-${index}`}
                            fill={VIBRANT_BAR_COLORS[index % VIBRANT_BAR_COLORS.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  ) : (
                    <AreaChart data={trend}>
                      <defs>
                        <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.35} />
                          <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11 }}
                        label={{ value: 'Date', position: 'insideBottom', offset: -2, fontSize: 11 }}
                      />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        label={{ value: 'Revenue (INR)', angle: -90, position: 'insideLeft', fontSize: 11 }}
                      />
                      <Tooltip formatter={(v) => formatInr(v)} />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke={theme.palette.primary.main}
                        fill="url(#revFill)"
                        name="Revenue"
                      />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Recent sales orders
                  </Typography>
                  <Stack spacing={1.25}>
                    {(overview.recentSalesOrders || []).length === 0 && (
                      <Typography color="text.secondary">No confirmed sales yet.</Typography>
                    )}
                    {(overview.recentSalesOrders || []).map((so) => (
                      <Stack key={so._id} direction="row" justifyContent="space-between" spacing={2}>
                        <Box>
                          <Typography fontWeight={600}>{so.orderNumber}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {so.customer?.name || '—'} · {so.status}
                          </Typography>
                        </Box>
                        <Typography fontWeight={600}>{formatInr(so.grandTotal)}</Typography>
                      </Stack>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Recent payments
                  </Typography>
                  <Stack spacing={1.25}>
                    {(overview.recentPayments || []).length === 0 && (
                      <Typography color="text.secondary">No payments recorded yet.</Typography>
                    )}
                    {(overview.recentPayments || []).map((p) => (
                      <Stack key={p._id} direction="row" justifyContent="space-between" spacing={2}>
                        <Box>
                          <Typography fontWeight={600}>{p.paymentNumber}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {p.invoice?.invoiceNumber || '—'} · {p.method}
                          </Typography>
                        </Box>
                        <Typography fontWeight={600}>{formatInr(p.amount)}</Typography>
                      </Stack>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Stack>
      )}
    </Box>
  );
}
