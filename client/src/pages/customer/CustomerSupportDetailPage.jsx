import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { toast } from 'react-toastify';
import PageHeader from '../../components/PageHeader';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import ErrorState from '../../components/ErrorState';
import {
  fetchCustomerSupportTicket,
  replyCustomerSupport,
} from '../../services/customerPortalService';

export default function CustomerSupportDetailPage() {
  const { id } = useParams();
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [reply, setReply] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const res = await fetchCustomerSupportTicket(id);
      setTicket(res.data.ticket);
      setStatus('success');
    } catch (err) {
      setError(err);
      setStatus('error');
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const onReply = async (e) => {
    e.preventDefault();
    if (!reply.trim()) return;
    setSubmitting(true);
    try {
      const res = await replyCustomerSupport(id, { message: reply.trim() });
      setTicket(res.data.ticket);
      setReply('');
      toast.success('Reply sent');
    } catch (err) {
      toast.error(err.message || 'Unable to send reply');
    } finally {
      setSubmitting(false);
    }
  };

  if (status === 'loading') return <LoadingSkeleton rows={5} />;
  if (status === 'error') {
    return <ErrorState title="Support ticket not found" message={error?.message} network={Boolean(error?.isNetworkError)} onRetry={load} />;
  }

  const closed = ['RESOLVED', 'CLOSED'].includes(ticket.status);

  return (
    <Box>
      <PageHeader
        title={ticket.ticketNumber}
        subtitle={ticket.subject}
        breadcrumbs={[
          { label: 'Portal', to: '/customer/dashboard' },
          { label: 'Support', to: '/customer/support' },
          { label: ticket.ticketNumber },
        ]}
        actions={
          <Button component={RouterLink} to="/customer/support" startIcon={<ArrowBackIcon />}>
            Back
          </Button>
        }
      />

      <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
        <Chip label={ticket.status} color="primary" />
        <Chip label={ticket.category} variant="outlined" />
        <Chip label={ticket.priority} variant="outlined" />
      </Stack>

      <Stack spacing={1.5} sx={{ mb: 3 }}>
        {(ticket.messages || []).map((m) => (
          <Card key={m._id || `${m.createdAt}-${m.message.slice(0, 12)}`} variant="outlined">
            <CardContent>
              <Typography variant="caption" color="text.secondary">
                {m.authorType} · {m.createdAt ? new Date(m.createdAt).toLocaleString() : ''}
                {m.author?.firstName
                  ? ` · ${m.author.firstName} ${m.author.lastName || ''}`
                  : ''}
              </Typography>
              <Typography sx={{ mt: 0.75, whiteSpace: 'pre-wrap' }}>{m.message}</Typography>
            </CardContent>
          </Card>
        ))}
      </Stack>

      {closed ? (
        <Alert severity="info">This ticket is closed. Open a new request if you need more help.</Alert>
      ) : (
        <Box component="form" onSubmit={onReply}>
          <TextField
            label="Your reply"
            fullWidth
            multiline
            minRows={3}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            sx={{ mb: 1.5 }}
          />
          <Button type="submit" variant="contained" disabled={submitting || !reply.trim()}>
            Send reply
          </Button>
        </Box>
      )}
    </Box>
  );
}
