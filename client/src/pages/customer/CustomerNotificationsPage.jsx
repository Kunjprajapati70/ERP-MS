import { useCallback, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
} from '@mui/material';
import { toast } from 'react-toastify';
import PageHeader from '../../components/PageHeader';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import ErrorState from '../../components/ErrorState';
import {
  fetchCustomerNotifications,
  markAllCustomerNotificationsRead,
  markCustomerNotificationRead,
} from '../../services/customerPortalService';

export default function CustomerNotificationsPage() {
  const { refreshUnread } = useOutletContext() || {};
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [items, setItems] = useState([]);

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const res = await fetchCustomerNotifications({ limit: 50 });
      setItems(res.data.items || []);
      setStatus('success');
    } catch (err) {
      setError(err);
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const markOne = async (id) => {
    try {
      await markCustomerNotificationRead(id);
      await load();
      refreshUnread?.();
    } catch (err) {
      toast.error(err.message || 'Unable to update notification');
    }
  };

  const markAll = async () => {
    try {
      await markAllCustomerNotificationsRead();
      toast.success('All notifications marked as read');
      await load();
      refreshUnread?.();
    } catch (err) {
      toast.error(err.message || 'Unable to update notifications');
    }
  };

  return (
    <Box>
      <PageHeader
        title="Notifications"
        subtitle="Order, invoice, payment, and support updates."
        breadcrumbs={[{ label: 'Portal', to: '/customer/dashboard' }, { label: 'Notifications' }]}
        actions={
          <Button variant="outlined" onClick={markAll}>
            Mark all as read
          </Button>
        }
      />

      {status === 'loading' && <LoadingSkeleton rows={4} />}
      {status === 'error' && (
        <ErrorState title="Unable to load notifications" message={error?.message} network={Boolean(error?.isNetworkError)} onRetry={load} />
      )}
      {status === 'success' && items.length === 0 && (
        <Typography color="text.secondary">No notifications.</Typography>
      )}
      {status === 'success' && (
        <Stack spacing={1.5}>
          {items.map((n) => (
            <Card
              key={n._id}
              variant="outlined"
              sx={{ bgcolor: n.status === 'READ' ? 'background.paper' : 'action.hover' }}
            >
              <CardContent>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  justifyContent="space-between"
                  spacing={1}
                >
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography fontWeight={700}>{n.title}</Typography>
                      {n.status !== 'READ' && <Chip size="small" label="Unread" color="primary" />}
                    </Stack>
                    <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                      {n.message}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}
                    </Typography>
                  </Box>
                  {n.status !== 'READ' && (
                    <Button size="small" onClick={() => markOne(n._id)}>
                      Mark read
                    </Button>
                  )}
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </Box>
  );
}
