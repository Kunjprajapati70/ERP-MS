import { useCallback, useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardMedia,
  Chip,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import { toast } from 'react-toastify';
import PageHeader from '../../components/PageHeader';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import ErrorState from '../../components/ErrorState';
import { fetchCustomerProducts } from '../../services/customerPortalService';
import { useCustomerCart } from '../../context/CustomerCartContext';
import { resolveProductImageUrl } from '../../utils/productImage';

function formatInr(value) {
  return `₹${Number(value || 0).toLocaleString('en-IN')}`;
}

const AVAIL_COLOR = {
  IN_STOCK: 'success',
  LIMITED: 'warning',
  OUT_OF_STOCK: 'error',
};

export default function CustomerProductsPage() {
  const { addItem } = useCustomerCart();
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('name');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const res = await fetchCustomerProducts({
        page,
        limit: 12,
        search: search || undefined,
        sort,
        minPrice: minPrice || undefined,
        maxPrice: maxPrice || undefined,
      });
      setItems(res.data.items || []);
      setTotal(res.data.pagination?.total || 0);
      setStatus('success');
    } catch (err) {
      setError(err);
      setStatus('error');
    }
  }, [page, search, sort, minPrice, maxPrice]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Box>
      <PageHeader
        title="Products"
        subtitle="Browse and purchase products available to you."
        breadcrumbs={[{ label: 'Portal', to: '/customer/dashboard' }, { label: 'Products' }]}
        actions={
          <Button component={RouterLink} to="/customer/cart" variant="outlined">
            View cart
          </Button>
        }
      />

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
        <TextField
          size="small"
          label="Search"
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          fullWidth
        />
        <TextField
          size="small"
          select
          label="Sort"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="name">Name A–Z</MenuItem>
          <MenuItem value="-sellingPrice">Price high–low</MenuItem>
          <MenuItem value="sellingPrice">Price low–high</MenuItem>
        </TextField>
        <TextField
          size="small"
          label="Min ₹"
          type="number"
          value={minPrice}
          onChange={(e) => setMinPrice(e.target.value)}
          sx={{ minWidth: 110 }}
        />
        <TextField
          size="small"
          label="Max ₹"
          type="number"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
          sx={{ minWidth: 110 }}
        />
      </Stack>

      {status === 'loading' && <LoadingSkeleton rows={4} />}
      {status === 'error' && (
        <ErrorState
          title="Unable to load products"
          message={error?.message}
          network={Boolean(error?.isNetworkError)}
          onRetry={load}
        />
      )}
      {status === 'success' && items.length === 0 && (
        <Typography color="text.secondary">No products found.</Typography>
      )}
      {status === 'success' && items.length > 0 && (
        <>
          <Grid container spacing={2}>
            {items.map((p) => {
              const img = resolveProductImageUrl(p.imageUrl);
              const out = p.availability === 'OUT_OF_STOCK';
              return (
                <Grid item xs={12} sm={6} md={4} key={p._id}>
                  <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    {img ? (
                      <CardMedia
                        component="img"
                        height="160"
                        image={img}
                        alt={p.name}
                        sx={{ objectFit: 'cover', bgcolor: 'action.hover' }}
                        onError={(e) => {
                          e.currentTarget.src =
                            'data:image/svg+xml,' +
                            encodeURIComponent(
                              `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect fill="#dceaf1" width="100%" height="100%"/><text x="50%" y="50%" fill="#4a6578" text-anchor="middle" dy=".3em" font-family="sans-serif">No image</text></svg>`
                            );
                        }}
                      />
                    ) : (
                      <Box
                        sx={{
                          height: 160,
                          bgcolor: 'action.hover',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Typography color="text.secondary">No image</Typography>
                      </Box>
                    )}
                    <CardContent sx={{ flex: 1 }}>
                      <Typography fontWeight={700}>{p.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        SKU: {p.sku}
                        {p.category?.name ? ` · ${p.category.name}` : ''}
                      </Typography>
                      <Typography sx={{ mt: 1 }} fontWeight={700} color="primary.main">
                        {formatInr(p.sellingPrice)}
                      </Typography>
                      <Chip
                        size="small"
                        label={(p.availability || '').replace(/_/g, ' ')}
                        color={AVAIL_COLOR[p.availability] || 'default'}
                        sx={{ mt: 1 }}
                      />
                    </CardContent>
                    <CardActions sx={{ px: 2, pb: 2, gap: 1, flexWrap: 'wrap' }}>
                      <Button size="small" component={RouterLink} to={`/customer/products/${p._id}`}>
                        Details
                      </Button>
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<AddShoppingCartIcon />}
                        disabled={out}
                        onClick={() => {
                          addItem(p, 1);
                          toast.success(`${p.name} added to cart`);
                        }}
                      >
                        Add to cart
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {total} product{total === 1 ? '' : 's'}
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button disabled={page * 12 >= total} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </Stack>
          </Stack>
        </>
      )}
    </Box>
  );
}
