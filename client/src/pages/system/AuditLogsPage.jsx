import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Button, MenuItem, Stack, TextField } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import PageHeader from '../../components/PageHeader';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import ErrorState from '../../components/ErrorState';
import DataTable from '../../components/DataTable';
import { fetchAuditLogs } from '../../services/auditService';

export default function AuditLogsPage() {
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const res = await fetchAuditLogs({
        page: page + 1,
        limit: rowsPerPage,
        search: search || undefined,
        module: moduleFilter || undefined,
      });
      setRows(res.data.items || []);
      setTotal(res.data.pagination?.total || 0);
      setStatus('success');
    } catch (err) {
      setError(err);
      setStatus('error');
    }
  }, [page, rowsPerPage, search, moduleFilter]);

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
        id: 'user',
        label: 'User',
        render: (row) =>
          row.user
            ? `${row.user.firstName || ''} ${row.user.lastName || ''}`.trim() || row.user.email
            : 'System',
      },
      { id: 'module', label: 'Module' },
      { id: 'action', label: 'Action' },
      {
        id: 'recordId',
        label: 'Record',
        render: (row) => row.recordId || '—',
      },
    ],
    []
  );

  return (
    <Box>
      <PageHeader
        title="Audit Logs"
        subtitle="Track important security and administrative actions."
        breadcrumbs={[{ label: 'System' }, { label: 'Audit Logs' }]}
        actions={
          <Button startIcon={<RefreshIcon />} variant="outlined" onClick={load}>
            Refresh
          </Button>
        }
      />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField
          size="small"
          label="Search"
          value={search}
          onChange={(e) => {
            setPage(0);
            setSearch(e.target.value);
          }}
          fullWidth
        />
        <TextField
          select
          size="small"
          label="Module"
          value={moduleFilter}
          onChange={(e) => {
            setPage(0);
            setModuleFilter(e.target.value);
          }}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="AUTH">Auth</MenuItem>
          <MenuItem value="USERS">Users</MenuItem>
          <MenuItem value="ROLES">Roles</MenuItem>
          <MenuItem value="SYSTEM">System</MenuItem>
        </TextField>
      </Stack>

      {status === 'loading' && <LoadingSkeleton rows={5} />}
      {status === 'error' && (
        <ErrorState
          network={Boolean(error?.isNetworkError)}
          title="Unable to load audit logs"
          message={error?.message}
          onRetry={load}
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
          emptyMessage="No audit events found."
        />
      )}
    </Box>
  );
}
