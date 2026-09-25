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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PictureAsPdfOutlinedIcon from '@mui/icons-material/PictureAsPdfOutlined';
import { toast } from 'react-toastify';
import PageHeader from '../../components/PageHeader';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import ErrorState from '../../components/ErrorState';
import {
  downloadCustomerInvoicePdf,
  fetchCustomerInvoice,
} from '../../services/customerPortalService';

function formatInr(value) {
  return `₹${Number(value || 0).toLocaleString('en-IN')}`;
}

export default function CustomerInvoiceDetailPage() {
  const { id } = useParams();
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [invoice, setInvoice] = useState(null);

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const res = await fetchCustomerInvoice(id);
      setInvoice(res.data.invoice);
      setStatus('success');
    } catch (err) {
      setError(err);
      setStatus('error');
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handlePdf = async () => {
    try {
      const blob = await downloadCustomerInvoicePdf(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoice.invoiceNumber}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Invoice PDF downloaded');
    } catch (err) {
      toast.error(err.message || 'Unable to download PDF');
    }
  };

  if (status === 'loading') return <LoadingSkeleton rows={6} />;
  if (status === 'error') {
    return <ErrorState title="Invoice not found" message={error?.message} network={Boolean(error?.isNetworkError)} onRetry={load} />;
  }

  const customer = invoice.customer || {};

  return (
    <Box>
      <PageHeader
        title={invoice.invoiceNumber}
        subtitle={`Invoice date ${
          invoice.invoiceDate ? new Date(invoice.invoiceDate).toLocaleDateString() : '—'
        }`}
        breadcrumbs={[
          { label: 'Portal', to: '/customer/dashboard' },
          { label: 'Invoices', to: '/customer/invoices' },
          { label: invoice.invoiceNumber },
        ]}
        actions={
          <Stack direction="row" spacing={1}>
            <Button component={RouterLink} to="/customer/invoices" startIcon={<ArrowBackIcon />}>
              Back
            </Button>
            <Button variant="contained" startIcon={<PictureAsPdfOutlinedIcon />} onClick={handlePdf}>
              Download PDF
            </Button>
          </Stack>
        }
      />

      <Card variant="outlined">
        <CardContent>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
            <Box>
              <Typography fontWeight={700}>Bill to</Typography>
              <Typography>{customer.name}</Typography>
              <Typography color="text.secondary">{customer.email}</Typography>
              <Typography color="text.secondary">{customer.billingAddress}</Typography>
              {customer.gstin && <Typography>GSTIN: {customer.gstin}</Typography>}
            </Box>
            <Box>
              <Chip label={invoice.paymentStatus} color="primary" sx={{ mb: 1 }} />
              <Typography>
                Due: {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : '—'}
              </Typography>
              {invoice.salesOrder?.orderNumber && (
                <Typography>Order: {invoice.salesOrder.orderNumber}</Typography>
              )}
            </Box>
          </Stack>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Product / service</TableCell>
                  <TableCell align="right">Qty</TableCell>
                  <TableCell align="right">Unit price</TableCell>
                  <TableCell align="right">Tax</TableCell>
                  <TableCell align="right">Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(invoice.items || []).map((line) => (
                  <TableRow key={line._id || line.product?._id}>
                    <TableCell>{line.product?.name || line.description || 'Item'}</TableCell>
                    <TableCell align="right">{line.quantity}</TableCell>
                    <TableCell align="right">{formatInr(line.unitPrice)}</TableCell>
                    <TableCell align="right">{line.taxPercent || 0}%</TableCell>
                    <TableCell align="right">{formatInr(line.lineTotal)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>

          <Stack spacing={0.5} alignItems="flex-end" sx={{ mt: 2 }}>
            <Typography>Subtotal: {formatInr(invoice.subtotal)}</Typography>
            <Typography>Tax: {formatInr(invoice.taxTotal)}</Typography>
            {invoice.discount ? <Typography>Discount: {formatInr(invoice.discount)}</Typography> : null}
            <Typography fontWeight={700}>Total: {formatInr(invoice.grandTotal)}</Typography>
            <Typography color="text.secondary">
              Balance due: {formatInr(invoice.balanceAmount)}
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
