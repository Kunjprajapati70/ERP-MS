import { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  useTheme,
} from '@mui/material';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import PageHeader from '../../components/PageHeader';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import ErrorState from '../../components/ErrorState';
import { fetchCustomerDashboard } from '../../services/customerPortalService';

const VIBRANT_BAR_COLORS = [
  '#2563EB', // Blue
  '#059669', // Emerald
  '#D97706', // Amber
  '#DC2626', // Red
  '#7C3AED', // Purple
  '#DB2777', // Magenta Pink
  '#0891B2', // Cyan
  '#EA580C', // Orange
  '#4F46E5', // Indigo
  '#65A30D', // Lime
  '#0D9488', // Teal
  '#9333EA', // Violet
];

function formatInr(value) {
  return `₹${Number(value || 0).toLocaleString('en-IN')}`;
}

function KpiCard({ label, value }) {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="overline" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h5" fontWeight={700} sx={{ mt: 0.5 }}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}

function EmptyChart({ message }) {
  return (
    <Box
      sx={{
        height: 260,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'text.secondary',
      }}
    >
      <Typography>{message}</Typography>
    </Box>
  );
}

export default function CustomerDashboardPage() {
  const theme = useTheme();
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const load = useCallback(async (opts = {}) => {
    const silent = Boolean(opts.silent);
    if (!silent) {
      setStatus('loading');
      setError(null);
    }
    try {
      const res = await fetchCustomerDashboard();
      setData(res.data);
      setStatus('success');
    } catch (err) {
      if (!silent) {
        setError(err);
        setStatus('error');
      }
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const id = setInterval(() => {
      load({ silent: true });
    }, 30000);
    return () => clearInterval(id);
  }, [load]);

  if (status === 'loading' && !data) return <LoadingSkeleton rows={6} />;
  if (status === 'error' && !data) {
    return <ErrorState title="Unable to load dashboard" message={error?.message} network={Boolean(error?.isNetworkError)} onRetry={load} />;
  }

  const kpis = data?.kpis || {};
  const monthlyOrders = data?.charts?.monthlyOrders || [];
  const monthlySpending = data?.charts?.monthlySpending || [];

  return (
    <Box>
      <PageHeader
        title="Dashboard"
        subtitle="Overview of your orders, invoices, and payments — auto-refreshes every 30s."
        breadcrumbs={[{ label: 'Portal', to: '/customer/dashboard' }, { label: 'Dashboard' }]}
      />

      {!data ? null : (
      <>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Total Orders', value: kpis.totalOrders ?? 0 },
          { label: 'Pending Orders', value: kpis.pendingOrders ?? 0 },
          { label: 'Completed Orders', value: kpis.completedOrders ?? 0 },
          { label: 'Total Invoiced', value: formatInr(kpis.totalInvoiced) },
          { label: 'Total Paid', value: formatInr(kpis.totalPaid) },
          { label: 'Outstanding', value: formatInr(kpis.outstanding) },
        ].map((kpi) => (
          <Grid item xs={12} sm={6} md={4} key={kpi.label}>
            <KpiCard label={kpi.label} value={kpi.value} />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Monthly Order Summary
              </Typography>
              {monthlyOrders.length === 0 ? (
                <EmptyChart message="No order activity yet this year." />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={monthlyOrders} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                    <XAxis dataKey="month" label={{ value: 'Month', position: 'insideBottom', offset: -2 }} />
                    <YAxis
                      allowDecimals={false}
                      label={{ value: 'Number of Orders', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="orders" name="Orders" radius={[6, 6, 0, 0]}>
                      {(monthlyOrders || []).map((_, idx) => (
                        <Cell
                          key={`order-cell-${idx}`}
                          fill={VIBRANT_BAR_COLORS[idx % VIBRANT_BAR_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Monthly Spending
              </Typography>
              {monthlySpending.length === 0 ? (
                <EmptyChart message="No invoiced spending yet this year." />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={monthlySpending} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                    <XAxis dataKey="month" label={{ value: 'Month', position: 'insideBottom', offset: -2 }} />
                    <YAxis
                      tickFormatter={(v) => `₹${v}`}
                      label={{ value: 'Amount (₹)', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip formatter={(v) => formatInr(v)} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="amount"
                      name="Amount (₹)"
                      stroke={theme.palette.secondary.main}
                      strokeWidth={2}
                      dot
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      </>
      )}
    </Box>
  );
}
