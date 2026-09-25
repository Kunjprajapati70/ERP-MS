import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Button, Card, CardContent, Chip, Stack, TextField, Typography } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import PageHeader from '../../components/PageHeader';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import ErrorState from '../../components/ErrorState';
import DataTable from '../../components/DataTable';
import { fetchInventorySummary, fetchStockLedger } from '../../services/productService';

export default function InventoryPage() {
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [typeFilter, setTypeFilter] = useState('');

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const [summaryRes, ledgerRes] = await Promise.all([
        fetchInventorySummary(),
        fetchStockLedger({
          page: page + 1,
          limit: rowsPerPage,
          type: typeFilter || undefined,
        }),
      ]);
      setSummary(summaryRes.data);
      setRows(ledgerRes.data.items || []);
      setTotal(ledgerRes.data.pagination?.total || 0);
      setStatus('success');
    } catch (err) {
      setError(err);
      setStatus('error');
    }
  }, [page, rowsPerPage, typeFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const columns = useMemo(
    () => [
      {
        id: 'createdAt',
        label: 'When',
        render: (row) => new Date(row.createdAt).toLocaleString(),
      },
      {
        id: 'product',
        label: 'Product',
        render: (row) => (row.product ? `${row.product.sku} — ${row.product.name}` : '—'),
      },
      { id: 'type', label: 'Type' },
      {
        id: 'quantity',
        label: 'Qty',
        render: (row) => {
          const qty = Math.abs(row.quantity);
          const isOut = row.quantity < 0;
          return (
            <Stack direction="row" alignItems="center" spacing={0.75}>
              <Typography color={isOut ? 'text.primary' : 'success.main'} fontWeight={600}>
                {isOut ? qty : `+${qty}`}
              </Typography>
              {isOut && (
                <Chip
                  size="small"
                  label="OUT"
                  variant="outlined"
                  sx={{ height: 18, fontSize: '0.62rem', fontWeight: 700 }}
                />
              )}
            </Stack>
          );
        },
      },
      {
        id: 'balanceAfter',
        label: 'Balance',
        render: (row) => Math.max(0, row.balanceAfter),
      },
      {
        id: 'warehouse',
        label: 'Warehouse',
        render: (row) => row.warehouse?.code || '—',
      },
      {
        id: 'notes',
        label: 'Notes',
        render: (row) => row.notes || '—',
      },
    ],
    []
  );

  const cards = [
    { label: 'Active products', value: summary?.totalProducts ?? '—' },
    { label: 'Total units', value: summary?.totalUnits != null ? Math.max(0, summary.totalUnits) : '—' },
    {
      label: 'Inventory value (₹)',
      value: summary ? Number(summary.inventoryValue).toLocaleString('en-IN') : '—',
    },
    { label: 'Low stock', value: summary?.lowStock ?? '—' },
    { label: 'Out of stock', value: summary?.outOfStock ?? '—' },
  ];

  return (
    <Box>
      <PageHeader
        title="Inventory"
        subtitle="Stock valuation and ledger of every stock movement."
        breadcrumbs={[{ label: 'Operations' }, { label: 'Inventory' }]}
        actions={
          <Button startIcon={<RefreshIcon />} variant="outlined" onClick={load}>
            Refresh
          </Button>
        }
      />

      {status === 'loading' && <LoadingSkeleton rows={4} />}
      {status === 'error' && (
        <ErrorState title="Unable to load inventory" message={error?.message} onRetry={load} network={Boolean(error?.isNetworkError)} />
      )}

      {status === 'success' && (
        <>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3 }} useFlexGap flexWrap="wrap">
            {cards.map((card) => (
              <Card key={card.label} variant="outlined" sx={{ flex: 1, minWidth: 160 }}>
                <CardContent>
                  <Typography color="text.secondary" variant="body2">
                    {card.label}
                  </Typography>
                  <Typography variant="h5" fontWeight={700}>
                    {card.value}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Stack>

          <TextField
            select
            size="small"
            label="Transaction type"
            value={typeFilter}
            onChange={(e) => {
              setPage(0);
              setTypeFilter(e.target.value);
            }}
            SelectProps={{ native: true }}
            sx={{ mb: 2, minWidth: 220 }}
          >
            <option value="">All types</option>
            {['OPENING', 'PURCHASE', 'SALE', 'RETURN', 'ADJUSTMENT', 'TRANSFER', 'PRODUCTION_IN', 'PRODUCTION_OUT'].map(
              (t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              )
            )}
          </TextField>

          <Typography variant="h6" sx={{ mb: 1 }}>
            Stock ledger
          </Typography>
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
            emptyMessage="No stock transactions yet."
          />
        </>
      )}
    </Box>
  );
}
