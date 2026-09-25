import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PageHeader from '../../components/PageHeader';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import ErrorState from '../../components/ErrorState';
import { fetchCustomerOrder } from '../../services/customerPortalService';

const TIMELINE = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];

function formatInr(value) {
  return `₹${Number(value || 0).toLocaleString('en-IN')}`;
}

function timelineIndex(status) {
  if (status === 'CANCELLED') return -1;
  if (status === 'DRAFT') return 0;
  const idx = TIMELINE.indexOf(status);
  return idx >= 0 ? idx : 0;
}

export default function CustomerOrderDetailPage() {
  const { id } = useParams();
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [order, setOrder] = useState(null);

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const res = await fetchCustomerOrder(id);
      setOrder(res.data.order);
      setStatus('success');
    } catch (err) {
      setError(err);
      setStatus('error');
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (status === 'loading') return <LoadingSkeleton rows={6} />;
  if (status === 'error') {
    return <ErrorState title="Order not found" message={error?.message} network={Boolean(error?.isNetworkError)} onRetry={load} />;
  }

  const activeStep = timelineIndex(order.status);
  const customer = order.customer || {};

  return (
    <Box>
      <PageHeader
        title={order.orderNumber}
        subtitle={`Placed ${order.orderDate ? new Date(order.orderDate).toLocaleString() : ''}`}
        breadcrumbs={[
          { label: 'Portal', to: '/customer/dashboard' },
          { label: 'Orders', to: '/customer/orders' },
          { label: order.orderNumber },
        ]}
        actions={
          <Button component={RouterLink} to="/customer/orders" startIcon={<ArrowBackIcon />}>
            Back
          </Button>
        }
      />

      <Stack spacing={2}>
        <Card variant="outlined">
          <CardContent>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
              <Typography fontWeight={700}>Order status</Typography>
              <Chip label={order.status} size="small" color="primary" />
            </Stack>
            {order.status === 'CANCELLED' ? (
              <Typography color="error">This order was cancelled.</Typography>
            ) : (
              <Stepper activeStep={activeStep} alternativeLabel sx={{ overflowX: 'auto' }}>
                {TIMELINE.map((label) => (
                  <Step key={label} completed={activeStep > TIMELINE.indexOf(label)}>
                    <StepLabel>{label.charAt(0) + label.slice(1).toLowerCase()}</StepLabel>
                  </Step>
                ))}
              </Stepper>
            )}
          </CardContent>
        </Card>

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent>
                <Typography fontWeight={700} gutterBottom>
                  Delivery Address
                </Typography>
                {order.shippingAddress?.addressLine ? (
                  <>
                    <Typography fontWeight={600}>
                      {order.shippingAddress.name || customer.name}
                    </Typography>
                    <Typography color="text.secondary">
                      Phone: {order.shippingAddress.phone || customer.phone || '—'}
                    </Typography>
                    <Typography sx={{ mt: 1 }}>
                      {order.shippingAddress.addressLine}
                    </Typography>
                    <Typography color="text.secondary">
                      {order.shippingAddress.city}, {order.shippingAddress.state} -{' '}
                      {order.shippingAddress.pincode}
                    </Typography>
                  </>
                ) : (
                  <>
                    <Typography fontWeight={600}>{customer.name}</Typography>
                    <Typography color="text.secondary">{customer.email}</Typography>
                    <Typography color="text.secondary">{customer.phone}</Typography>
                    <Typography sx={{ mt: 1 }}>
                      {customer.shippingAddress || customer.billingAddress || '—'}
                      {customer.city ? `, ${customer.city}` : ''}
                    </Typography>
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card variant="outlined" sx={{ height: '100%' }}>
              <CardContent>
                <Typography fontWeight={700} gutterBottom>
                  Payment Information
                </Typography>
                <Stack spacing={1} sx={{ mt: 1 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography color="text.secondary">Method:</Typography>
                    <Chip
                      label={
                        order.paymentMethod === 'UPI'
                          ? 'UPI / QR Payment'
                          : order.paymentMethod === 'CARD'
                          ? 'Debit / Credit Card'
                          : order.paymentMethod === 'COD'
                          ? 'Pay on Delivery'
                          : order.paymentMethod || 'Pay on Delivery'
                      }
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  </Stack>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography color="text.secondary">Payment Status:</Typography>
                    <Chip
                      label={order.paymentStatus || 'PENDING'}
                      size="small"
                      color={
                        order.paymentStatus === 'PAID'
                          ? 'success'
                          : order.paymentStatus === 'COD'
                          ? 'info'
                          : 'warning'
                      }
                    />
                  </Stack>
                  {order.paymentDetails?.upiId && (
                    <Typography variant="body2" color="text.secondary">
                      UPI ID: {order.paymentDetails.upiId}
                    </Typography>
                  )}
                  {order.paymentDetails?.cardLast4 && (
                    <Typography variant="body2" color="text.secondary">
                      Card: •••• {order.paymentDetails.cardLast4}
                    </Typography>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Card variant="outlined">
          <CardContent>
            <Typography fontWeight={700} gutterBottom>
              Line items
            </Typography>
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Product</TableCell>
                    <TableCell align="right">Qty</TableCell>
                    <TableCell align="right">Unit price</TableCell>
                    <TableCell align="right">Line total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(order.items || []).map((line) => (
                    <TableRow key={line._id || line.product?._id}>
                      <TableCell>{line.product?.name || 'Item'}</TableCell>
                      <TableCell align="right">{line.quantity}</TableCell>
                      <TableCell align="right">{formatInr(line.unitPrice)}</TableCell>
                      <TableCell align="right">{formatInr(line.lineTotal)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
            <Divider sx={{ my: 2 }} />
            <Stack spacing={0.5} alignItems="flex-end">
              <Typography>Subtotal: {formatInr(order.subtotal)}</Typography>
              <Typography>Tax: {formatInr(order.taxTotal)}</Typography>
              <Typography fontWeight={700}>Grand total: {formatInr(order.grandTotal)}</Typography>
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}
