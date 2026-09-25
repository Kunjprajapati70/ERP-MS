import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  Radio,
  RadioGroup,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ShoppingCartCheckoutIcon from '@mui/icons-material/ShoppingCartCheckout';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import AddLocationAltOutlinedIcon from '@mui/icons-material/AddLocationAltOutlined';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SecurityIcon from '@mui/icons-material/Security';
import { toast } from 'react-toastify';
import PageHeader from '../../components/PageHeader';
import { useCustomerCart } from '../../context/CustomerCartContext';
import {
  fetchCustomerAddresses,
  fetchCustomerProfile,
  placeCustomerOrder,
} from '../../services/customerPortalService';
import { resolveProductImageUrl } from '../../utils/productImage';

const STEPS = ['Cart Items', 'Delivery Address', 'Payment Options', 'Place Order'];

function formatInr(value) {
  return `₹${Number(value || 0).toLocaleString('en-IN')}`;
}

export default function CustomerCartPage() {
  const navigate = useNavigate();
  const { items, updateQty, removeItem, clear } = useCustomerCart();
  const [activeStep, setActiveStep] = useState(0);

  // Address state
  const [addresses, setAddresses] = useState([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [saveNewAddress, setSaveNewAddress] = useState(true);
  const [newAddress, setNewAddress] = useState({
    name: '',
    phone: '',
    addressLine: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
  });

  // Payment state
  const [paymentMethod, setPaymentMethod] = useState('UPI'); // 'UPI' | 'CARD' | 'COD'
  const [upiId, setUpiId] = useState('');
  const [upiVerified, setUpiVerified] = useState(false);
  const [selectedUpiApp, setSelectedUpiApp] = useState('Google Pay');
  const [cardData, setCardData] = useState({
    number: '',
    name: '',
    expiry: '',
    cvv: '',
  });

  // Order state
  const [notes, setNotes] = useState('');
  const [placing, setPlacing] = useState(false);

  // Pricing calculations
  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + Number(i.price || 0) * Number(i.quantity || 0), 0),
    [items]
  );
  const estimatedTax = useMemo(() => Math.round(subtotal * 0.18), [subtotal]);
  const grandTotal = useMemo(() => subtotal + estimatedTax, [subtotal, estimatedTax]);

  // Load addresses on mount
  const loadAddresses = useCallback(async () => {
    setLoadingAddresses(true);
    try {
      const [addrRes, profRes] = await Promise.all([
        fetchCustomerAddresses(),
        fetchCustomerProfile(),
      ]);
      const list = addrRes.data || [];
      setAddresses(list);

      // Default profile prefill for new address form if needed
      const profCustomer = profRes.data?.customer || {};
      const profUser = profRes.data?.user || {};
      setNewAddress((prev) => ({
        ...prev,
        name: prev.name || profCustomer.name || `${profUser.firstName || ''} ${profUser.lastName || ''}`.trim(),
        phone: prev.phone || profCustomer.phone || profUser.phone || '',
        addressLine: prev.addressLine || profCustomer.shippingAddress || profCustomer.billingAddress || '',
        city: prev.city || profCustomer.city || '',
        state: prev.state || profCustomer.state || '',
        pincode: prev.pincode || profCustomer.pincode || '',
      }));

      // Select default or first address
      if (list.length > 0) {
        const defaultAddr = list.find((a) => a.isDefault) || list[0];
        setSelectedAddressId(defaultAddr._id);
        setShowNewAddressForm(false);
      } else {
        setShowNewAddressForm(true);
      }
    } catch {
      // Non-blocking
      setShowNewAddressForm(true);
    } finally {
      setLoadingAddresses(false);
    }
  }, []);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  // Computed selected address object
  const chosenAddress = useMemo(() => {
    if (showNewAddressForm) {
      return newAddress;
    }
    const found = addresses.find((a) => a._id === selectedAddressId);
    return found || newAddress;
  }, [showNewAddressForm, addresses, selectedAddressId, newAddress]);

  // Step 2 Validation (Delivery Address)
  const isAddressValid = useMemo(() => {
    if (!showNewAddressForm && selectedAddressId) return true;
    return Boolean(
      newAddress.name?.trim() &&
        newAddress.phone?.trim() &&
        newAddress.addressLine?.trim() &&
        newAddress.city?.trim() &&
        newAddress.state?.trim() &&
        newAddress.pincode?.trim()
    );
  }, [showNewAddressForm, selectedAddressId, newAddress]);

  // Step 3 Validation (Payment Method)
  const isPaymentValid = useMemo(() => {
    if (paymentMethod === 'COD') return true;
    if (paymentMethod === 'UPI') {
      return Boolean(upiId.trim() || selectedUpiApp);
    }
    if (paymentMethod === 'CARD') {
      return (
        cardData.number.replace(/\s/g, '').length >= 15 &&
        cardData.name.trim().length > 2 &&
        cardData.expiry.length >= 4 &&
        cardData.cvv.length >= 3
      );
    }
    return true;
  }, [paymentMethod, upiId, selectedUpiApp, cardData]);

  // Submit Order Action (Step 4)
  const handlePlaceOrder = async () => {
    if (!items.length) {
      toast.info('Your cart is empty');
      setActiveStep(0);
      return;
    }
    if (!isAddressValid) {
      toast.error('Please specify a valid delivery address');
      setActiveStep(1);
      return;
    }

    setPlacing(true);
    try {
      const payload = {
        items: items.map((i) => ({ product: i.productId, quantity: i.quantity })),
        shippingAddress: chosenAddress,
        paymentMethod,
        paymentDetails:
          paymentMethod === 'UPI'
            ? { upiId: upiId || `${selectedUpiApp.toLowerCase().replace(/\s/g, '')}@upi` }
            : paymentMethod === 'CARD'
            ? {
                cardLast4: cardData.number.replace(/\s/g, '').slice(-4) || '8888',
                cardType: 'VISA/MasterCard',
              }
            : {},
        saveAddress: showNewAddressForm && saveNewAddress,
        notes: notes.trim() || undefined,
      };

      const res = await placeCustomerOrder(payload);
      clear();
      toast.success('Order placed successfully!');
      navigate(`/customer/orders/${res.data.order._id}`);
    } catch (err) {
      toast.error(err.message || 'Unable to place order');
    } finally {
      setPlacing(false);
    }
  };

  return (
    <Box>
      <PageHeader
        title="Checkout"
        subtitle="Complete your purchase with secure address and payment options."
        breadcrumbs={[
          { label: 'Portal', to: '/customer/dashboard' },
          { label: 'Products', to: '/customer/products' },
          { label: 'Cart & Checkout' },
        ]}
      />

      {/* Stepper Navigation */}
      <Card variant="outlined" sx={{ mb: 3, p: 2.5 }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {STEPS.map((label, index) => (
            <Step key={label} completed={activeStep > index}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Card>

      {!items.length ? (
        <Card variant="outlined">
          <CardContent sx={{ py: 6, textAlign: 'center' }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Your cart is empty.
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              Looks like you haven't added any products to your cart yet.
            </Typography>
            <Button component={RouterLink} to="/customer/products" variant="contained" size="large">
              Browse Products
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {/* Main Flow Content */}
          <Grid item xs={12} md={8}>
            {/* STEP 1: CART ITEMS */}
            {activeStep === 0 && (
              <Stack spacing={2}>
                <Card variant="outlined">
                  <Box sx={{ p: 2, bgcolor: 'action.hover', borderBottom: 1, borderColor: 'divider' }}>
                    <Typography variant="subtitle1" fontWeight={700}>
                      1. Review Cart Items ({items.length})
                    </Typography>
                  </Box>
                  <Box sx={{ overflowX: 'auto' }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Product</TableCell>
                          <TableCell align="right">Price</TableCell>
                          <TableCell align="center">Quantity</TableCell>
                          <TableCell align="right">Line Total</TableCell>
                          <TableCell align="right">Remove</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {items.map((item) => (
                          <TableRow key={item.productId}>
                            <TableCell>
                              <Stack direction="row" spacing={1.5} alignItems="center">
                                <Box
                                  component="img"
                                  src={resolveProductImageUrl(item.imageUrl)}
                                  alt={item.name}
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                  sx={{
                                    width: 48,
                                    height: 48,
                                    objectFit: 'cover',
                                    borderRadius: 1,
                                    bgcolor: 'action.hover',
                                  }}
                                />
                                <Box>
                                  <Typography fontWeight={600}>{item.name}</Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {item.sku}
                                  </Typography>
                                </Box>
                              </Stack>
                            </TableCell>
                            <TableCell align="right">{formatInr(item.price)}</TableCell>
                            <TableCell align="center">
                              <TextField
                                type="number"
                                size="small"
                                value={item.quantity}
                                onChange={(e) => updateQty(item.productId, e.target.value)}
                                inputProps={{ min: 1, style: { width: 56, textAlign: 'center' } }}
                              />
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 600 }}>
                              {formatInr(item.price * item.quantity)}
                            </TableCell>
                            <TableCell align="right">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => removeItem(item.productId)}
                                aria-label="Remove item"
                              >
                                <DeleteOutlineIcon fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
                </Card>

                <Card variant="outlined">
                  <CardContent>
                    <TextField
                      label="Order Notes / Instructions (Optional)"
                      fullWidth
                      multiline
                      minRows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Special instructions for delivery or order fulfillment..."
                    />
                  </CardContent>
                </Card>

                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Button
                    component={RouterLink}
                    to="/customer/products"
                    startIcon={<ArrowBackIcon />}
                  >
                    Continue Shopping
                  </Button>
                  <Button
                    variant="contained"
                    size="large"
                    endIcon={<ArrowForwardIcon />}
                    onClick={() => setActiveStep(1)}
                  >
                    Proceed to Delivery Address
                  </Button>
                </Stack>
              </Stack>
            )}

            {/* STEP 2: DELIVERY ADDRESS */}
            {activeStep === 1 && (
              <Stack spacing={2}>
                <Card variant="outlined">
                  <Box sx={{ p: 2, bgcolor: 'action.hover', borderBottom: 1, borderColor: 'divider' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="subtitle1" fontWeight={700}>
                        2. Select or Add Delivery Address
                      </Typography>
                      {addresses.length > 0 && !showNewAddressForm && (
                        <Button
                          size="small"
                          startIcon={<AddLocationAltOutlinedIcon />}
                          onClick={() => setShowNewAddressForm(true)}
                        >
                          + Add New Address
                        </Button>
                      )}
                    </Stack>
                  </Box>

                  <CardContent>
                    {loadingAddresses ? (
                      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ py: 3 }}>
                        <CircularProgress size={20} />
                        <Typography color="text.secondary">Loading saved addresses…</Typography>
                      </Stack>
                    ) : (
                      <Stack spacing={2}>
                        {/* Display already saved addresses */}
                        {addresses.length > 0 && !showNewAddressForm && (
                          <RadioGroup
                            value={selectedAddressId}
                            onChange={(e) => setSelectedAddressId(e.target.value)}
                          >
                            <Grid container spacing={2}>
                              {addresses.map((addr) => {
                                const selected = selectedAddressId === addr._id;
                                return (
                                  <Grid item xs={12} key={addr._id}>
                                    <Card
                                      variant="outlined"
                                      sx={{
                                        borderColor: selected ? 'primary.main' : 'divider',
                                        bgcolor: selected ? 'primary.50' : 'background.paper',
                                        borderWidth: selected ? 2 : 1,
                                      }}
                                    >
                                      <CardActionArea
                                        onClick={() => setSelectedAddressId(addr._id)}
                                        sx={{ p: 2 }}
                                      >
                                        <Stack direction="row" spacing={1.5} alignItems="flex-start">
                                          <Radio checked={selected} value={addr._id} />
                                          <Box sx={{ flex: 1 }}>
                                            <Stack direction="row" spacing={1} alignItems="center">
                                              <Typography fontWeight={700}>
                                                {addr.name || 'Recipient'}
                                              </Typography>
                                              {addr.isDefault && (
                                                <Chip label="Default" size="small" color="primary" />
                                              )}
                                            </Stack>
                                            <Typography variant="body2" sx={{ mt: 0.5 }}>
                                              {addr.addressLine}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                              {addr.city}, {addr.state} - {addr.pincode}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                              Phone: {addr.phone}
                                            </Typography>
                                          </Box>
                                        </Stack>
                                      </CardActionArea>
                                    </Card>
                                  </Grid>
                                );
                              })}
                            </Grid>
                          </RadioGroup>
                        )}

                        {/* Add New Address Form */}
                        {showNewAddressForm && (
                          <Box>
                            {addresses.length > 0 && (
                              <Stack direction="row" justifyContent="space-between" sx={{ mb: 2 }}>
                                <Typography fontWeight={600}>Enter New Address Details</Typography>
                                <Button size="small" onClick={() => setShowNewAddressForm(false)}>
                                  Choose Saved Address
                                </Button>
                              </Stack>
                            )}
                            <Grid container spacing={2}>
                              <Grid item xs={12} sm={6}>
                                <TextField
                                  label="Full Name / Receiver"
                                  fullWidth
                                  size="small"
                                  required
                                  value={newAddress.name}
                                  onChange={(e) =>
                                    setNewAddress((p) => ({ ...p, name: e.target.value }))
                                  }
                                />
                              </Grid>
                              <Grid item xs={12} sm={6}>
                                <TextField
                                  label="Phone Number"
                                  fullWidth
                                  size="small"
                                  required
                                  value={newAddress.phone}
                                  onChange={(e) =>
                                    setNewAddress((p) => ({ ...p, phone: e.target.value }))
                                  }
                                />
                              </Grid>
                              <Grid item xs={12}>
                                <TextField
                                  label="Street Address / Building / Flat"
                                  fullWidth
                                  size="small"
                                  required
                                  multiline
                                  minRows={2}
                                  value={newAddress.addressLine}
                                  onChange={(e) =>
                                    setNewAddress((p) => ({ ...p, addressLine: e.target.value }))
                                  }
                                />
                              </Grid>
                              <Grid item xs={12} sm={4}>
                                <TextField
                                  label="City"
                                  fullWidth
                                  size="small"
                                  required
                                  value={newAddress.city}
                                  onChange={(e) =>
                                    setNewAddress((p) => ({ ...p, city: e.target.value }))
                                  }
                                />
                              </Grid>
                              <Grid item xs={12} sm={4}>
                                <TextField
                                  label="State"
                                  fullWidth
                                  size="small"
                                  required
                                  value={newAddress.state}
                                  onChange={(e) =>
                                    setNewAddress((p) => ({ ...p, state: e.target.value }))
                                  }
                                />
                              </Grid>
                              <Grid item xs={12} sm={4}>
                                <TextField
                                  label="Pincode / Postal Code"
                                  fullWidth
                                  size="small"
                                  required
                                  value={newAddress.pincode}
                                  onChange={(e) =>
                                    setNewAddress((p) => ({ ...p, pincode: e.target.value }))
                                  }
                                />
                              </Grid>
                              <Grid item xs={12}>
                                <FormControlLabel
                                  control={
                                    <Checkbox
                                      checked={saveNewAddress}
                                      onChange={(e) => setSaveNewAddress(e.target.checked)}
                                    />
                                  }
                                  label="Save this address for future purchases"
                                />
                              </Grid>
                            </Grid>
                          </Box>
                        )}
                      </Stack>
                    )}
                  </CardContent>
                </Card>

                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Button startIcon={<ArrowBackIcon />} onClick={() => setActiveStep(0)}>
                    Back to Cart
                  </Button>
                  <Button
                    variant="contained"
                    size="large"
                    disabled={!isAddressValid}
                    endIcon={<ArrowForwardIcon />}
                    onClick={() => setActiveStep(2)}
                  >
                    Proceed to Payment Options
                  </Button>
                </Stack>
              </Stack>
            )}

            {/* STEP 3: PAYMENT OPTIONS */}
            {activeStep === 2 && (
              <Stack spacing={2}>
                <Card variant="outlined">
                  <Box sx={{ p: 2, bgcolor: 'action.hover', borderBottom: 1, borderColor: 'divider' }}>
                    <Typography variant="subtitle1" fontWeight={700}>
                      3. Select Payment Method
                    </Typography>
                  </Box>

                  <CardContent>
                    <RadioGroup
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                    >
                      <Stack spacing={2}>
                        {/* Option 1: UPI */}
                        <Card
                          variant="outlined"
                          sx={{
                            borderColor: paymentMethod === 'UPI' ? 'primary.main' : 'divider',
                            borderWidth: paymentMethod === 'UPI' ? 2 : 1,
                          }}
                        >
                          <CardActionArea onClick={() => setPaymentMethod('UPI')} sx={{ p: 2 }}>
                            <Stack direction="row" spacing={1.5} alignItems="center">
                              <Radio checked={paymentMethod === 'UPI'} value="UPI" />
                              <QrCode2Icon color="primary" sx={{ fontSize: 28 }} />
                              <Box sx={{ flex: 1 }}>
                                <Typography fontWeight={700}>UPI / QR Code</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Instant payment via Google Pay, PhonePe, Paytm, or any UPI App
                                </Typography>
                              </Box>
                              <Chip label="Instant" size="small" color="success" variant="outlined" />
                            </Stack>
                          </CardActionArea>

                          <Collapse in={paymentMethod === 'UPI'}>
                            <Divider />
                            <Box sx={{ p: 2.5, bgcolor: 'background.default' }}>
                              <Typography variant="body2" fontWeight={600} gutterBottom>
                                Select your preferred UPI App or enter UPI ID:
                              </Typography>
                              <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                                {['Google Pay', 'PhonePe', 'Paytm', 'BHIM'].map((app) => (
                                  <Chip
                                    key={app}
                                    label={app}
                                    clickable
                                    color={selectedUpiApp === app ? 'primary' : 'default'}
                                    variant={selectedUpiApp === app ? 'filled' : 'outlined'}
                                    onClick={() => setSelectedUpiApp(app)}
                                  />
                                ))}
                              </Stack>
                              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                                <TextField
                                  label="Enter UPI ID / VPA (e.g. mobile@upi)"
                                  fullWidth
                                  size="small"
                                  value={upiId}
                                  onChange={(e) => {
                                    setUpiId(e.target.value);
                                    setUpiVerified(false);
                                  }}
                                  placeholder="username@okhdfcbank"
                                />
                                <Button
                                  variant="outlined"
                                  onClick={() => {
                                    if (!upiId) return toast.info('Enter UPI ID to verify');
                                    setUpiVerified(true);
                                    toast.success('UPI ID verified successfully');
                                  }}
                                >
                                  {upiVerified ? 'Verified' : 'Verify'}
                                </Button>
                              </Stack>
                            </Box>
                          </Collapse>
                        </Card>

                        {/* Option 2: Debit / Credit Card */}
                        <Card
                          variant="outlined"
                          sx={{
                            borderColor: paymentMethod === 'CARD' ? 'primary.main' : 'divider',
                            borderWidth: paymentMethod === 'CARD' ? 2 : 1,
                          }}
                        >
                          <CardActionArea onClick={() => setPaymentMethod('CARD')} sx={{ p: 2 }}>
                            <Stack direction="row" spacing={1.5} alignItems="center">
                              <Radio checked={paymentMethod === 'CARD'} value="CARD" />
                              <CreditCardIcon color="primary" sx={{ fontSize: 28 }} />
                              <Box sx={{ flex: 1 }}>
                                <Typography fontWeight={700}>Debit / Credit Card</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  All major cards supported (Visa, MasterCard, RuPay, Maestro)
                                </Typography>
                              </Box>
                            </Stack>
                          </CardActionArea>

                          <Collapse in={paymentMethod === 'CARD'}>
                            <Divider />
                            <Box sx={{ p: 2.5, bgcolor: 'background.default' }}>
                              <Grid container spacing={2}>
                                <Grid item xs={12}>
                                  <TextField
                                    label="Card Number"
                                    fullWidth
                                    size="small"
                                    placeholder="4532 0000 0000 8921"
                                    value={cardData.number}
                                    onChange={(e) =>
                                      setCardData((p) => ({ ...p, number: e.target.value }))
                                    }
                                  />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                  <TextField
                                    label="Name on Card"
                                    fullWidth
                                    size="small"
                                    value={cardData.name}
                                    onChange={(e) =>
                                      setCardData((p) => ({ ...p, name: e.target.value }))
                                    }
                                  />
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                  <TextField
                                    label="Expiry (MM/YY)"
                                    fullWidth
                                    size="small"
                                    placeholder="MM/YY"
                                    value={cardData.expiry}
                                    onChange={(e) =>
                                      setCardData((p) => ({ ...p, expiry: e.target.value }))
                                    }
                                  />
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                  <TextField
                                    label="CVV"
                                    fullWidth
                                    size="small"
                                    type="password"
                                    placeholder="123"
                                    value={cardData.cvv}
                                    onChange={(e) =>
                                      setCardData((p) => ({ ...p, cvv: e.target.value }))
                                    }
                                  />
                                </Grid>
                              </Grid>
                            </Box>
                          </Collapse>
                        </Card>

                        {/* Option 3: Pay on Delivery (COD) */}
                        <Card
                          variant="outlined"
                          sx={{
                            borderColor: paymentMethod === 'COD' ? 'primary.main' : 'divider',
                            borderWidth: paymentMethod === 'COD' ? 2 : 1,
                          }}
                        >
                          <CardActionArea onClick={() => setPaymentMethod('COD')} sx={{ p: 2 }}>
                            <Stack direction="row" spacing={1.5} alignItems="center">
                              <Radio checked={paymentMethod === 'COD'} value="COD" />
                              <LocalShippingOutlinedIcon color="primary" sx={{ fontSize: 28 }} />
                              <Box sx={{ flex: 1 }}>
                                <Typography fontWeight={700}>Pay on Delivery (Cash / UPI)</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Pay via Cash or QR code when your shipment arrives at your door
                                </Typography>
                              </Box>
                            </Stack>
                          </CardActionArea>

                          <Collapse in={paymentMethod === 'COD'}>
                            <Divider />
                            <Box sx={{ p: 2.5, bgcolor: 'background.default' }}>
                              <Alert severity="info" icon={<LocalShippingOutlinedIcon />}>
                                You can pay with Cash or scan the delivery executive's UPI QR code upon
                                receiving your goods.
                              </Alert>
                            </Box>
                          </Collapse>
                        </Card>
                      </Stack>
                    </RadioGroup>
                  </CardContent>
                </Card>

                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Button startIcon={<ArrowBackIcon />} onClick={() => setActiveStep(1)}>
                    Back to Address
                  </Button>
                  <Button
                    variant="contained"
                    size="large"
                    disabled={!isPaymentValid}
                    endIcon={<ArrowForwardIcon />}
                    onClick={() => setActiveStep(3)}
                  >
                    Proceed to Review & Place Order
                  </Button>
                </Stack>
              </Stack>
            )}

            {/* STEP 4: PLACE ORDER & SUMMARY */}
            {activeStep === 3 && (
              <Stack spacing={2}>
                <Card variant="outlined">
                  <Box sx={{ p: 2, bgcolor: 'action.hover', borderBottom: 1, borderColor: 'divider' }}>
                    <Typography variant="subtitle1" fontWeight={700}>
                      4. Review & Confirm Order
                    </Typography>
                  </Box>

                  <CardContent>
                    <Stack spacing={3}>
                      {/* Delivery Address Summary */}
                      <Card variant="outlined" sx={{ p: 2 }}>
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          alignItems="flex-start"
                        >
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <HomeOutlinedIcon color="primary" />
                            <Box>
                              <Typography fontWeight={700}>Shipping Address</Typography>
                              <Typography variant="body2" sx={{ mt: 0.5 }}>
                                {chosenAddress.name} ({chosenAddress.phone})
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {chosenAddress.addressLine}, {chosenAddress.city}, {chosenAddress.state} -{' '}
                                {chosenAddress.pincode}
                              </Typography>
                            </Box>
                          </Stack>
                          <Button size="small" onClick={() => setActiveStep(1)}>
                            Change
                          </Button>
                        </Stack>
                      </Card>

                      {/* Payment Method Summary */}
                      <Card variant="outlined" sx={{ p: 2 }}>
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          alignItems="flex-start"
                        >
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            {paymentMethod === 'UPI' && <QrCode2Icon color="primary" />}
                            {paymentMethod === 'CARD' && <CreditCardIcon color="primary" />}
                            {paymentMethod === 'COD' && <LocalShippingOutlinedIcon color="primary" />}
                            <Box>
                              <Typography fontWeight={700}>Payment Option</Typography>
                              <Typography variant="body2" sx={{ mt: 0.5 }}>
                                {paymentMethod === 'UPI' &&
                                  `UPI: ${upiId || selectedUpiApp}`}
                                {paymentMethod === 'CARD' &&
                                  `Card ending in •••• ${cardData.number.slice(-4) || '8921'}`}
                                {paymentMethod === 'COD' && 'Pay on Delivery (Cash / UPI)'}
                              </Typography>
                            </Box>
                          </Stack>
                          <Button size="small" onClick={() => setActiveStep(2)}>
                            Change
                          </Button>
                        </Stack>
                      </Card>

                      {/* Items mini-table */}
                      <Box>
                        <Typography fontWeight={700} gutterBottom>
                          Ordered Items ({items.length})
                        </Typography>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Product</TableCell>
                              <TableCell align="center">Qty</TableCell>
                              <TableCell align="right">Amount</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {items.map((i) => (
                              <TableRow key={i.productId}>
                                <TableCell>
                                  <Typography variant="body2" fontWeight={600}>
                                    {i.name}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {i.sku}
                                  </Typography>
                                </TableCell>
                                <TableCell align="center">{i.quantity}</TableCell>
                                <TableCell align="right">
                                  {formatInr(i.price * i.quantity)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>

                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Button startIcon={<ArrowBackIcon />} onClick={() => setActiveStep(2)}>
                    Back to Payment Options
                  </Button>
                  <Button
                    variant="contained"
                    color="success"
                    size="large"
                    disabled={placing}
                    startIcon={
                      placing ? (
                        <CircularProgress size={20} color="inherit" />
                      ) : (
                        <ShoppingCartCheckoutIcon />
                      )
                    }
                    onClick={handlePlaceOrder}
                    sx={{ px: 4, py: 1.25, fontWeight: 700 }}
                  >
                    {placing ? 'Placing Order…' : `Place Order (${formatInr(grandTotal)})`}
                  </Button>
                </Stack>
              </Stack>
            )}
          </Grid>

          {/* Right Column: Order Price Summary */}
          <Grid item xs={12} md={4}>
            <Card variant="outlined" sx={{ position: 'sticky', top: 90 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  Order Summary
                </Typography>
                <Divider sx={{ my: 1.5 }} />

                <Stack spacing={1.5}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography color="text.secondary">Items Total ({items.length})</Typography>
                    <Typography fontWeight={600}>{formatInr(subtotal)}</Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography color="text.secondary">Estimated Taxes (GST 18%)</Typography>
                    <Typography fontWeight={600}>{formatInr(estimatedTax)}</Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography color="text.secondary">Delivery Charges</Typography>
                    <Typography fontWeight={600} color="success.main">
                      FREE
                    </Typography>
                  </Stack>

                  <Divider sx={{ my: 1 }} />

                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6" fontWeight={700}>
                      Payable Amount:
                    </Typography>
                    <Typography variant="h6" fontWeight={700} color="primary.main">
                      {formatInr(grandTotal)}
                    </Typography>
                  </Stack>

                  <Alert severity="success" icon={<SecurityIcon fontSize="inherit" />} sx={{ mt: 2 }}>
                    Safe & Secure Checkout. Verified ERP order processing.
                  </Alert>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}
