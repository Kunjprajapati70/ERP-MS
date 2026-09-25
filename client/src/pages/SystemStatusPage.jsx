import { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import PageHeader from '../components/PageHeader';
import LoadingSkeleton from '../components/LoadingSkeleton';
import ErrorState from '../components/ErrorState';
import { fetchHealth } from '../services/healthService';

export default function SystemStatusPage() {
  const [status, setStatus] = useState('loading');
  const [payload, setPayload] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const data = await fetchHealth();
      setPayload(data);
      setStatus(data.success ? 'success' : 'degraded');
    } catch (err) {
      setError(err);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Box>
      <PageHeader
        title="System Status"
        subtitle="Phase 0 scaffold — verify API and MongoDB Atlas connectivity."
        breadcrumbs={[{ label: 'Overview' }, { label: 'System Status' }]}
        actions={
          <Button startIcon={<RefreshIcon />} variant="outlined" onClick={load}>
            Refresh
          </Button>
        }
      />

      {status === 'loading' && <LoadingSkeleton rows={3} />}

      {status === 'error' && (
        <ErrorState
          network={Boolean(error?.isNetworkError)}
          title={error?.isNetworkError ? 'Unable to connect to the server.' : 'Health check failed'}
          message={error?.message || 'Unexpected error while checking API health.'}
          onRetry={load}
        />
      )}

      {(status === 'success' || status === 'degraded') && payload && (
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          useFlexGap
          sx={{ flexWrap: 'wrap' }}
        >
          <Card variant="outlined" sx={{ flex: 1, minWidth: 240 }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                API Status
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                <Chip
                  label={payload.data?.status || 'unknown'}
                  color={payload.success ? 'success' : 'warning'}
                  size="small"
                />
                <Typography variant="body1" fontWeight={600}>
                  {payload.message}
                </Typography>
              </Stack>
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ flex: 1, minWidth: 240 }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Database
              </Typography>
              <Typography variant="h6" sx={{ textTransform: 'capitalize' }}>
                {payload.data?.database?.readyState || 'unknown'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {payload.data?.database?.connected
                  ? 'Connected to MongoDB Atlas'
                  : 'Not connected — set MONGODB_URI in server/.env'}
              </Typography>
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ flex: 1, minWidth: 240 }}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Environment
              </Typography>
              <Typography variant="h6">{payload.data?.environment}</Typography>
              <Typography variant="body2" color="text.secondary">
                Uptime: {payload.data?.uptimeSeconds ?? 0}s · v{payload.data?.version}
              </Typography>
            </CardContent>
          </Card>
        </Stack>
      )}
    </Box>
  );
}
