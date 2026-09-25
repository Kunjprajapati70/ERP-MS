import { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
  useTheme,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import PageHeader from '../components/PageHeader';
import LoadingSkeleton from '../components/LoadingSkeleton';
import ErrorState from '../components/ErrorState';
import DataTable, { StatusChip } from '../components/DataTable';
import {
  fetchInventoryReport,
  fetchPaymentsReport,
  fetchReceivablesReport,
  fetchSalesReport,
} from '../services/analyticsService';

const COLORS = ['#1565c0', '#2e7d32', '#ed6c02', '#d32f2f', '#6a1b9a', '#00838f'];
const VIBRANT_PALETTE = [
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
  '#16A34A', // Green
  '#C026D3', // Fuchsia
];

function formatInr(value) {
  return `₹${Number(value || 0).toLocaleString('en-IN')}`;
}

export default function ReportsPage() {
  const theme = useTheme();
  const [tab, setTab] = useState(0);
  const [days, setDays] = useState(30);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [sales, setSales] = useState(null);
  const [receivables, setReceivables] = useState(null);
  const [inventory, setInventory] = useState(null);
  const [payments, setPayments] = useState(null);

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const [s, r, i, p] = await Promise.all([
        fetchSalesReport({ days }),
        fetchReceivablesReport(),
        fetchInventoryReport(),
        fetchPaymentsReport({ days }),
      ]);
      setSales(s.data);
      setReceivables(r.data);
      setInventory(i.data);
      setPayments(p.data);
      setStatus('success');
    } catch (err) {
      setError(err);
      setStatus('error');
    }
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  const agingChart = receivables
    ? [
        { name: 'Current', amount: receivables.summary.current.amount },
        { name: '1–30', amount: receivables.summary.days1to30.amount },
        { name: '31–60', amount: receivables.summary.days31to60.amount },
        { name: '61+', amount: receivables.summary.days61plus.amount },
      ]
    : [];

  return (
    <Box>
      <PageHeader
        title="Reports"
        subtitle="Sales, receivables, inventory, and payment analytics from live data."
        breadcrumbs={[{ label: 'Overview' }, { label: 'Reports' }]}
        actions={
          <Stack direction="row" spacing={1}>
            <TextField
              select
              size="small"
              label="Period"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              sx={{ minWidth: 120 }}
            >
              {[7, 14, 30, 90].map((d) => (
                <MenuItem key={d} value={d}>
                  {d} days
                </MenuItem>
              ))}
            </TextField>
            <Button startIcon={<RefreshIcon />} variant="outlined" onClick={load}>
              Refresh
            </Button>
          </Stack>
        }
      />

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Sales" />
        <Tab label="Receivables" />
        <Tab label="Inventory" />
        <Tab label="Payments" />
      </Tabs>

      {status === 'loading' && <LoadingSkeleton rows={4} />}
      {status === 'error' && (
        <ErrorState
          title="Unable to load reports"
          message={error?.message}
          onRetry={load}
          network={Boolean(error?.isNetworkError)}
        />
      )}

      {status === 'success' && tab === 0 && sales && (
        <Stack spacing={2}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="overline">Revenue</Typography>
                  <Typography variant="h5">{formatInr(sales.totals.revenue)}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="overline">Orders</Typography>
                  <Typography variant="h5">{sales.totals.orders}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="overline">Avg order</Typography>
                  <Typography variant="h5">{formatInr(sales.totals.avgOrder)}</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Daily confirmed revenue
              </Typography>
              <Box sx={{ height: 280 }}>
                <ResponsiveContainer>
                  <BarChart data={sales.daily}>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => formatInr(v)} />
                    <Bar dataKey="revenue" name="Revenue" radius={[6, 6, 0, 0]}>
                      {(sales.daily || []).map((_, idx) => (
                        <Cell
                          key={`sales-bar-${idx}`}
                          fill={VIBRANT_PALETTE[idx % VIBRANT_PALETTE.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>

          <DataTable
            columns={[
              { id: 'sku', label: 'SKU', render: (r) => r.sku || '—' },
              { id: 'name', label: 'Product', render: (r) => r.name || '—' },
              { id: 'qty', label: 'Qty sold' },
              {
                id: 'revenue',
                label: 'Revenue',
                render: (r) => formatInr(r.revenue),
              },
            ]}
            rows={sales.topProducts || []}
            page={0}
            rowsPerPage={10}
            total={(sales.topProducts || []).length}
            onPageChange={() => {}}
            onRowsPerPageChange={() => {}}
            emptyMessage="No confirmed sales in this period."
          />
        </Stack>
      )}

      {status === 'success' && tab === 1 && receivables && (
        <Stack spacing={2}>
          <Typography variant="h6">
            Outstanding: {formatInr(receivables.totalOutstanding)}
          </Typography>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="subtitle1" gutterBottom>
                Aging buckets
              </Typography>
              <Box sx={{ height: 260 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={agingChart} dataKey="amount" nameKey="name" outerRadius={90} label>
                      {agingChart.map((_, idx) => (
                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => formatInr(v)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
          <DataTable
            columns={[
              { id: 'invoiceNumber', label: 'Invoice' },
              { id: 'customer', label: 'Customer', render: (r) => r.customer?.name || '—' },
              {
                id: 'balanceAmount',
                label: 'Balance',
                render: (r) => formatInr(r.balanceAmount),
              },
              {
                id: 'paymentStatus',
                label: 'Status',
                render: (r) => <StatusChip status={r.paymentStatus} />,
              },
              { id: 'daysPastDue', label: 'Days past due' },
            ]}
            rows={receivables.invoices || []}
            page={0}
            rowsPerPage={10}
            total={(receivables.invoices || []).length}
            onPageChange={() => {}}
            onRowsPerPageChange={() => {}}
            emptyMessage="No outstanding invoices."
          />
        </Stack>
      )}

      {status === 'success' && tab === 2 && inventory && (
        <Stack spacing={2}>
          <Grid container spacing={2}>
            <Grid item xs={6} md={3}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="overline">Products</Typography>
                  <Typography variant="h5">{inventory.totals.activeProducts}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} md={3}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="overline">Low stock</Typography>
                  <Typography variant="h5">{inventory.totals.lowStock}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} md={3}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="overline">Out of stock</Typography>
                  <Typography variant="h5">{inventory.totals.outOfStock}</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={6} md={3}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="overline">Value @ cost</Typography>
                  <Typography variant="h5">{formatInr(inventory.totals.inventoryValueAtCost)}</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          <DataTable
            columns={[
              { id: 'sku', label: 'SKU' },
              { id: 'name', label: 'Product' },
              { id: 'currentStock', label: 'Stock' },
              { id: 'minimumStock', label: 'Min' },
              {
                id: 'category',
                label: 'Category',
                render: (r) => r.category?.name || '—',
              },
            ]}
            rows={inventory.lowStock || []}
            page={0}
            rowsPerPage={10}
            total={(inventory.lowStock || []).length}
            onPageChange={() => {}}
            onRowsPerPageChange={() => {}}
            emptyMessage="No low-stock products."
          />
        </Stack>
      )}

      {status === 'success' && tab === 3 && payments && (
        <Stack spacing={2}>
          <Typography variant="h6">
            Collected ({payments.days}d): {formatInr(payments.totals.amount)} · {payments.totals.count}{' '}
            payments
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    By method
                  </Typography>
                  <Box sx={{ height: 260 }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie
                          data={payments.byMethod}
                          dataKey="amount"
                          nameKey="method"
                          outerRadius={90}
                          label
                        >
                          {(payments.byMethod || []).map((_, idx) => (
                            <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => formatInr(v)} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    Daily collections
                  </Typography>
                  <Box sx={{ height: 260 }}>
                    <ResponsiveContainer>
                      <BarChart data={payments.daily}>
                        <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v) => formatInr(v)} />
                        <Bar dataKey="amount" name="Amount" radius={[6, 6, 0, 0]}>
                          {(payments.daily || []).map((_, idx) => (
                            <Cell
                              key={`pay-bar-${idx}`}
                              fill={VIBRANT_PALETTE[(idx + 4) % VIBRANT_PALETTE.length]}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Stack>
      )}
    </Box>
  );
}
