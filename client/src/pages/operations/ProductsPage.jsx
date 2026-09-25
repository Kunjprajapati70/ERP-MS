import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import TuneIcon from '@mui/icons-material/Tune';
import RefreshIcon from '@mui/icons-material/Refresh';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import PageHeader from '../../components/PageHeader';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import ErrorState from '../../components/ErrorState';
import DataTable, { StatusChip } from '../../components/DataTable';
import ConfirmDialog from '../../components/ConfirmDialog';
import {
  adjustStock,
  createProduct,
  deleteProduct,
  fetchCategories,
  fetchProducts,
  fetchWarehouses,
  updateProduct,
} from '../../services/productService';

const emptyForm = {
  name: '',
  sku: '',
  barcode: '',
  category: '',
  brand: '',
  description: '',
  purchasePrice: 0,
  sellingPrice: 0,
  taxPercent: 0,
  openingStock: 0,
  minimumStock: 5,
  maximumStock: 1000,
  unit: 'PCS',
  warehouse: '',
  status: 'ACTIVE',
  imageUrl: '',
  visibleToCustomers: true,
};

function StockStatusChip({ product }) {
  const status = product.stockStatus || (product.currentStock <= 0 ? 'OUT_OF_STOCK' : product.currentStock <= product.minimumStock ? 'LOW_STOCK' : 'IN_STOCK');
  const color = status === 'IN_STOCK' ? 'success' : status === 'LOW_STOCK' ? 'warning' : 'error';
  return <Chip size="small" label={status.replaceAll('_', ' ')} color={color} variant="outlined" />;
}

export default function ProductsPage() {
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [categories, setCategories] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [adjustTarget, setAdjustTarget] = useState(null);
  const [adjustMode, setAdjustMode] = useState('ADD');
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustNotes, setAdjustNotes] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm({ defaultValues: emptyForm });

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const [productsRes, catsRes, whRes] = await Promise.all([
        fetchProducts({
          page: page + 1,
          limit: rowsPerPage,
          search: search || undefined,
          stockStatus: stockFilter || undefined,
        }),
        fetchCategories({ limit: 100, isActive: true }),
        fetchWarehouses({ limit: 100, isActive: true }),
      ]);
      setRows(productsRes.data.items || []);
      setTotal(productsRes.data.pagination?.total || 0);
      setCategories(catsRes.data.items || []);
      setWarehouses(whRes.data.items || []);
      setStatus('success');
    } catch (err) {
      setError(err);
      setStatus('error');
    }
  }, [page, rowsPerPage, search, stockFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setFormError(null);
    reset(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (product) => {
    setEditing(product);
    setFormError(null);
    reset({
      name: product.name,
      sku: product.sku,
      barcode: product.barcode || '',
      category: product.category?._id || '',
      brand: product.brand || '',
      description: product.description || '',
      purchasePrice: product.purchasePrice,
      sellingPrice: product.sellingPrice,
      taxPercent: product.taxPercent || 0,
      openingStock: 0,
      minimumStock: product.minimumStock,
      maximumStock: product.maximumStock,
      unit: product.unit,
      warehouse: product.warehouse?._id || '',
      status: product.status || 'ACTIVE',
      imageUrl: product.imageUrl || '',
      visibleToCustomers: product.visibleToCustomers !== false,
    });
    setDialogOpen(true);
  };

  const onSubmit = async (values) => {
    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        name: values.name.trim(),
        sku: values.sku.trim().toUpperCase(),
        barcode: values.barcode || '',
        brand: values.brand || '',
        description: values.description || '',
        purchasePrice: Math.max(0, Number(values.purchasePrice) || 0),
        sellingPrice: Math.max(0, Number(values.sellingPrice) || 0),
        taxPercent: Math.max(0, Math.min(100, Number(values.taxPercent || 0))),
        minimumStock: Math.max(0, Number(values.minimumStock || 0)),
        maximumStock: Math.max(0, Number(values.maximumStock || 0)),
        unit: (values.unit || 'PCS').trim().toUpperCase(),
        status: values.status || 'ACTIVE',
        category: values.category || null,
        warehouse: values.warehouse || null,
        imageUrl: values.imageUrl || '',
        visibleToCustomers:
          values.visibleToCustomers === true ||
          values.visibleToCustomers === 'true' ||
          values.visibleToCustomers === undefined,
      };

      if (editing) {
        await updateProduct(editing._id, payload);
        toast.success('Product updated');
      } else {
        payload.openingStock = Math.max(0, Number(values.openingStock || 0));
        await createProduct(payload);
        toast.success('Product created');
      }
      setDialogOpen(false);
      load();
    } catch (err) {
      setFormError(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    try {
      await deleteProduct(deleteTarget._id);
      toast.success('Product deleted');
      setDeleteTarget(null);
      load();
    } catch (err) {
      toast.error(err.message || 'Delete failed');
    }
  };

  const submitAdjust = async () => {
    const rawQty = Math.abs(Number(adjustQty));
    if (!rawQty || rawQty <= 0) {
      toast.error('Enter a quantity greater than 0');
      return;
    }
    const current = adjustTarget?.currentStock || 0;
    if (adjustMode === 'DEDUCT' && rawQty > current) {
      toast.error(`Cannot deduct more than current stock (${current} ${adjustTarget?.unit})`);
      return;
    }
    const qty = adjustMode === 'DEDUCT' ? -rawQty : rawQty;
    try {
      await adjustStock(adjustTarget._id, { quantity: qty, notes: adjustNotes });
      toast.success('Stock adjusted');
      setAdjustTarget(null);
      setAdjustQty('');
      setAdjustNotes('');
      load();
    } catch (err) {
      toast.error(err.message || 'Adjustment failed');
    }
  };

  const columns = useMemo(
    () => [
      { id: 'sku', label: 'SKU' },
      { id: 'name', label: 'Product' },
      {
        id: 'category',
        label: 'Category',
        render: (row) => row.category?.name || '—',
      },
      {
        id: 'stock',
        label: 'Stock',
        render: (row) => `${row.currentStock} ${row.unit}`,
      },
      {
        id: 'stockStatus',
        label: 'Stock status',
        render: (row) => <StockStatusChip product={row} />,
      },
      {
        id: 'sellingPrice',
        label: 'Sell ₹',
        render: (row) => Number(row.sellingPrice).toLocaleString('en-IN'),
      },
      {
        id: 'status',
        label: 'Status',
        render: (row) => <StatusChip status={row.status} />,
      },
      {
        id: 'actions',
        label: 'Actions',
        align: 'right',
        render: (row) => (
          <Stack direction="row" spacing={0.5} justifyContent="flex-end">
            <Tooltip title="Adjust stock">
              <IconButton size="small" onClick={() => setAdjustTarget(row)}>
                <TuneIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Edit">
              <IconButton size="small" onClick={() => openEdit(row)}>
                <EditOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton size="small" color="error" onClick={() => setDeleteTarget(row)}>
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        ),
      },
    ],
    []
  );

  return (
    <Box>
      <PageHeader
        title="Products"
        subtitle="Catalog management with live stock levels."
        breadcrumbs={[{ label: 'Operations' }, { label: 'Products' }]}
        actions={
          <Stack direction="row" spacing={1}>
            <Button startIcon={<RefreshIcon />} variant="outlined" onClick={load}>
              Refresh
            </Button>
            <Button startIcon={<AddIcon />} variant="contained" onClick={openCreate}>
              Add product
            </Button>
          </Stack>
        }
      />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField
          size="small"
          label="Search name / SKU / brand"
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
          label="Stock"
          value={stockFilter}
          onChange={(e) => {
            setPage(0);
            setStockFilter(e.target.value);
          }}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="IN_STOCK">In stock</MenuItem>
          <MenuItem value="LOW_STOCK">Low stock</MenuItem>
          <MenuItem value="OUT_OF_STOCK">Out of stock</MenuItem>
        </TextField>
      </Stack>

      {status === 'loading' && <LoadingSkeleton rows={5} />}
      {status === 'error' && (
        <ErrorState title="Unable to load products" message={error?.message} onRetry={load} network={Boolean(error?.isNetworkError)} />
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
          emptyMessage="No products found."
        />
      )}

      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{editing ? 'Edit product' : 'Add product'}</DialogTitle>
        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
          <DialogContent>
            {formError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {formError}
              </Alert>
            )}
            <Stack spacing={2} sx={{ pt: 1 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Name"
                  fullWidth
                  required
                  {...register('name', { required: 'Product name is required' })}
                  error={Boolean(errors.name)}
                  helperText={errors.name?.message}
                />
                <TextField
                  label="SKU"
                  fullWidth
                  required
                  {...register('sku', { required: 'SKU is required' })}
                  error={Boolean(errors.sku)}
                  helperText={errors.sku?.message}
                />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField label="Barcode" fullWidth {...register('barcode')} />
                <TextField label="Brand" fullWidth {...register('brand')} />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Controller
                  name="category"
                  control={control}
                  render={({ field }) => (
                    <TextField select label="Category" fullWidth {...field} value={field.value ?? ''}>
                      <MenuItem value="">None</MenuItem>
                      {categories.map((c) => (
                        <MenuItem key={c._id} value={c._id}>
                          {c.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
                <Controller
                  name="warehouse"
                  control={control}
                  render={({ field }) => (
                    <TextField select label="Warehouse" fullWidth {...field} value={field.value ?? ''}>
                      <MenuItem value="">None</MenuItem>
                      {warehouses.map((w) => (
                        <MenuItem key={w._id} value={w._id}>
                          {w.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Purchase price ₹"
                  type="number"
                  fullWidth
                  required
                  inputProps={{ min: 0, step: 'any' }}
                  {...register('purchasePrice', {
                    required: 'Purchase price is required',
                    min: { value: 0, message: 'Must be ≥ 0' },
                  })}
                  error={Boolean(errors.purchasePrice)}
                  helperText={errors.purchasePrice?.message}
                />
                <TextField
                  label="Selling price ₹"
                  type="number"
                  fullWidth
                  required
                  inputProps={{ min: 0, step: 'any' }}
                  {...register('sellingPrice', {
                    required: 'Selling price is required',
                    min: { value: 0, message: 'Must be ≥ 0' },
                  })}
                  error={Boolean(errors.sellingPrice)}
                  helperText={errors.sellingPrice?.message}
                />
                <TextField
                  label="Tax %"
                  type="number"
                  fullWidth
                  inputProps={{ min: 0, max: 100, step: 'any' }}
                  {...register('taxPercent', { min: { value: 0, message: 'Must be ≥ 0' } })}
                  error={Boolean(errors.taxPercent)}
                  helperText={errors.taxPercent?.message}
                />
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                {!editing && (
                  <TextField
                    label="Opening stock"
                    type="number"
                    fullWidth
                    inputProps={{ min: 0 }}
                    {...register('openingStock', { min: { value: 0, message: 'Must be ≥ 0' } })}
                    error={Boolean(errors.openingStock)}
                    helperText={errors.openingStock?.message}
                  />
                )}
                <TextField
                  label="Minimum stock"
                  type="number"
                  fullWidth
                  inputProps={{ min: 0 }}
                  {...register('minimumStock', { min: { value: 0, message: 'Must be ≥ 0' } })}
                  error={Boolean(errors.minimumStock)}
                  helperText={errors.minimumStock?.message}
                />
                <TextField
                  label="Maximum stock"
                  type="number"
                  fullWidth
                  inputProps={{ min: 0 }}
                  {...register('maximumStock', { min: { value: 0, message: 'Must be ≥ 0' } })}
                  error={Boolean(errors.maximumStock)}
                  helperText={errors.maximumStock?.message}
                />
                <TextField label="Unit" fullWidth {...register('unit')} />
              </Stack>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <TextField select label="Status" fullWidth {...field} value={field.value ?? 'ACTIVE'}>
                    <MenuItem value="ACTIVE">Active</MenuItem>
                    <MenuItem value="INACTIVE">Inactive</MenuItem>
                    <MenuItem value="DISCONTINUED">Discontinued</MenuItem>
                  </TextField>
                )}
              />
              <TextField
                label="Image URL"
                fullWidth
                placeholder="https://… or /uploads/product.jpg"
                {...register('imageUrl')}
                helperText="Shown in the customer portal catalog"
              />
              <Controller
                name="visibleToCustomers"
                control={control}
                render={({ field }) => (
                  <TextField
                    select
                    label="Visible to customers"
                    fullWidth
                    value={String(field.value ?? true)}
                    onChange={(e) => field.onChange(e.target.value === 'true')}
                  >
                    <MenuItem value="true">Yes</MenuItem>
                    <MenuItem value="false">No</MenuItem>
                  </TextField>
                )}
              />
              <TextField label="Description" fullWidth multiline minRows={2} {...register('description')} />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      <Dialog open={Boolean(adjustTarget)} onClose={() => setAdjustTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle>Adjust stock — {adjustTarget?.sku}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Current stock: <strong>{adjustTarget?.currentStock ?? 0} {adjustTarget?.unit}</strong>
          </Typography>

          <ToggleButtonGroup
            value={adjustMode}
            exclusive
            onChange={(_, v) => v && setAdjustMode(v)}
            fullWidth
            size="small"
            sx={{ mb: 2 }}
          >
            <ToggleButton value="ADD" color="success">
              + Add Stock
            </ToggleButton>
            <ToggleButton value="DEDUCT" color="error">
              − Deduct Stock
            </ToggleButton>
          </ToggleButtonGroup>

          <Stack spacing={2}>
            <TextField
              label={adjustMode === 'ADD' ? 'Quantity to add' : 'Quantity to deduct'}
              type="number"
              value={adjustQty}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '' || Number(val) >= 0) {
                  setAdjustQty(val);
                }
              }}
              inputProps={{
                min: 1,
                ...(adjustMode === 'DEDUCT' ? { max: adjustTarget?.currentStock ?? 0 } : {}),
              }}
              helperText={
                adjustMode === 'DEDUCT' && Number(adjustQty) > (adjustTarget?.currentStock ?? 0)
                  ? `Exceeds current stock (${adjustTarget?.currentStock ?? 0})`
                  : adjustQty
                    ? `New stock will be: ${
                        adjustMode === 'ADD'
                          ? (adjustTarget?.currentStock ?? 0) + Number(adjustQty || 0)
                          : Math.max(0, (adjustTarget?.currentStock ?? 0) - Number(adjustQty || 0))
                      } ${adjustTarget?.unit}`
                    : ''
              }
              error={adjustMode === 'DEDUCT' && Number(adjustQty) > (adjustTarget?.currentStock ?? 0)}
              fullWidth
              autoFocus
            />
            <TextField
              label="Notes / Reason"
              value={adjustNotes}
              onChange={(e) => setAdjustNotes(e.target.value)}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAdjustTarget(null)}>Cancel</Button>
          <Button
            variant="contained"
            color={adjustMode === 'DEDUCT' ? 'error' : 'primary'}
            onClick={submitAdjust}
            disabled={adjustMode === 'DEDUCT' && Number(adjustQty) > (adjustTarget?.currentStock ?? 0)}
          >
            {adjustMode === 'ADD' ? 'Add Stock' : 'Deduct Stock'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete product"
        message={deleteTarget ? `Delete ${deleteTarget.name} (${deleteTarget.sku}) and its stock ledger?` : ''}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </Box>
  );
}
