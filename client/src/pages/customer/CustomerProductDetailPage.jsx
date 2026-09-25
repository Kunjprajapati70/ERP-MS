import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import ShoppingCartCheckoutIcon from '@mui/icons-material/ShoppingCartCheckout';
import { toast } from 'react-toastify';
import PageHeader from '../../components/PageHeader';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import ErrorState from '../../components/ErrorState';
import {
  fetchCustomerProduct,
  placeCustomerOrder,
} from '../../services/customerPortalService';
import { useCustomerCart } from '../../context/CustomerCartContext';
import { resolveProductImageUrl } from '../../utils/productImage';

function formatInr(value) {
  return `₹${Number(value || 0).toLocaleString('en-IN')}`;
}

export default function CustomerProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCustomerCart();
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [product, setProduct] = useState(null);
  const [qty, setQty] = useState(1);
  const [buying, setBuying] = useState(false);

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const res = await fetchCustomerProduct(id);
      setProduct(res.data.product);
      setStatus('success');
    } catch (err) {
      setError(err);
      setStatus('error');
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (status === 'loading') return <LoadingSkeleton rows={4} />;
  if (status === 'error') {
    return (
      <ErrorState
        title="Product not found"
        message={error?.message}
        network={Boolean(error?.isNetworkError)}
        onRetry={load}
      />
    );
  }

  const img = resolveProductImageUrl(product.imageUrl);
  const out = product.availability === 'OUT_OF_STOCK';

  const buyNow = async () => {
    setBuying(true);
    try {
      const res = await placeCustomerOrder({
        items: [{ product: product._id, quantity: Number(qty) || 1 }],
      });
      toast.success('Order placed successfully');
      navigate(`/customer/orders/${res.data.order._id}`);
    } catch (err) {
      toast.error(err.message || 'Unable to place order');
    } finally {
      setBuying(false);
    }
  };

  return (
    <Box>
      <PageHeader
        title={product.name}
        subtitle={`SKU ${product.sku}`}
        breadcrumbs={[
          { label: 'Portal', to: '/customer/dashboard' },
          { label: 'Products', to: '/customer/products' },
          { label: product.name },
        ]}
        actions={
          <Button component={RouterLink} to="/customer/products" startIcon={<ArrowBackIcon />}>
            Back
          </Button>
        }
      />

      <Grid container spacing={2}>
        <Grid item xs={12} md={5}>
          <Card variant="outlined">
            {img ? (
              <Box
                component="img"
                src={img}
                alt={product.name}
                sx={{
                  width: '100%',
                  maxHeight: 360,
                  objectFit: 'cover',
                  display: 'block',
                  bgcolor: 'action.hover',
                }}
                onError={(e) => {
                  e.currentTarget.src =
                    'data:image/svg+xml,' +
                    encodeURIComponent(
                      `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect fill="#dceaf1" width="100%" height="100%"/><text x="50%" y="50%" fill="#4a6578" text-anchor="middle" dy=".3em" font-family="sans-serif">Image unavailable</text></svg>`
                    );
                }}
              />
            ) : (
              <Box
                sx={{
                  height: 280,
                  bgcolor: 'action.hover',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography color="text.secondary">No image</Typography>
              </Box>
            )}
          </Card>
        </Grid>
        <Grid item xs={12} md={7}>
          <Card variant="outlined">
            <CardContent>
              <Stack spacing={1.5}>
                <Typography color="text.secondary">
                  {product.description || 'No description provided.'}
                </Typography>
                <Typography>
                  Category: {product.category?.name || '—'} · Brand: {product.brand || '—'} · Unit:{' '}
                  {product.unit}
                </Typography>
                <Typography variant="h5" fontWeight={700} color="primary.main">
                  {formatInr(product.sellingPrice)}
                  {product.taxPercent ? ` · Tax ${product.taxPercent}%` : ''}
                </Typography>
                <Chip
                  label={(product.availability || '').replace(/_/g, ' ')}
                  color={
                    product.availability === 'IN_STOCK'
                      ? 'success'
                      : product.availability === 'LIMITED'
                        ? 'warning'
                        : 'error'
                  }
                  sx={{ alignSelf: 'flex-start' }}
                />

                <TextField
                  label="Quantity"
                  type="number"
                  size="small"
                  value={qty}
                  onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
                  inputProps={{ min: 1 }}
                  sx={{ maxWidth: 140 }}
                  disabled={out}
                />

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  <Button
                    variant="outlined"
                    startIcon={<AddShoppingCartIcon />}
                    disabled={out}
                    onClick={() => {
                      addItem(product, qty);
                      toast.success(`${product.name} added to cart`);
                    }}
                  >
                    Add to cart
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<ShoppingCartCheckoutIcon />}
                    disabled={out || buying}
                    onClick={buyNow}
                  >
                    {buying ? 'Placing…' : 'Buy now'}
                  </Button>
                </Stack>
                {out && (
                  <Typography color="error" variant="body2">
                    This product is currently out of stock.
                  </Typography>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
