const customerPortalService = require('../services/customerPortalService');
const notificationService = require('../services/notificationService');
const asyncHandler = require('../utils/asyncHandler');

const register = asyncHandler(async (req, res) => {
  const data = await customerPortalService.registerCustomer(req.body, req);
  res.status(201).json({
    success: true,
    message: 'Customer registration successful',
    data,
  });
});

const getProfile = asyncHandler(async (req, res) => {
  const data = await customerPortalService.getProfile(req.customer, req.user);
  res.json({ success: true, message: 'Profile retrieved', data });
});

const updateProfile = asyncHandler(async (req, res) => {
  const data = await customerPortalService.updateProfile(
    req.customer,
    req.user,
    req.body,
    req
  );
  res.json({ success: true, message: 'Profile updated', data });
});

const getDashboard = asyncHandler(async (req, res) => {
  const data = await customerPortalService.getDashboard(req.customer._id);
  res.json({ success: true, message: 'Dashboard retrieved', data });
});

const listProducts = asyncHandler(async (req, res) => {
  const data = await customerPortalService.listCatalog(req.query);
  res.json({ success: true, message: 'Products retrieved', data });
});

const getProduct = asyncHandler(async (req, res) => {
  const product = await customerPortalService.getCatalogProduct(req.params.id);
  res.json({ success: true, message: 'Product retrieved', data: { product } });
});

const listOrders = asyncHandler(async (req, res) => {
  const data = await customerPortalService.listOrders(req.customer._id, req.query);
  res.json({ success: true, message: 'Orders retrieved', data });
});

const getOrder = asyncHandler(async (req, res) => {
  const order = await customerPortalService.getOrder(req.customer._id, req.params.id);
  res.json({ success: true, message: 'Order retrieved', data: { order } });
});

const placeOrder = asyncHandler(async (req, res) => {
  const order = await customerPortalService.placeOrder(
    req.customer,
    req.user,
    req.body,
    req
  );
  res.status(201).json({ success: true, message: 'Order placed successfully', data: { order } });
});

const listInvoices = asyncHandler(async (req, res) => {
  const data = await customerPortalService.listInvoices(req.customer._id, req.query);
  res.json({ success: true, message: 'Invoices retrieved', data });
});

const getInvoice = asyncHandler(async (req, res) => {
  const invoice = await customerPortalService.getInvoice(req.customer._id, req.params.id);
  res.json({ success: true, message: 'Invoice retrieved', data: { invoice } });
});

const downloadInvoicePdf = asyncHandler(async (req, res) => {
  const { buffer, filename } = await customerPortalService.getInvoicePdf(
    req.customer._id,
    req.params.id,
    req.user._id,
    req
  );
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
});

const listPayments = asyncHandler(async (req, res) => {
  const data = await customerPortalService.listPayments(req.customer._id, req.query);
  res.json({ success: true, message: 'Payments retrieved', data });
});

const listNotifications = asyncHandler(async (req, res) => {
  const data = await notificationService.listNotifications(req.user._id, req.query);
  res.json({ success: true, message: 'Notifications retrieved', data });
});

const unreadNotifications = asyncHandler(async (req, res) => {
  const count = await notificationService.getUnreadCount(req.user._id);
  res.json({ success: true, message: 'Unread count', data: { count } });
});

const markNotificationRead = asyncHandler(async (req, res) => {
  const notification = await notificationService.markAsRead(req.user._id, req.params.id);
  res.json({ success: true, message: 'Notification marked as read', data: { notification } });
});

const markAllNotificationsRead = asyncHandler(async (req, res) => {
  const data = await notificationService.markAllAsRead(req.user._id);
  res.json({ success: true, message: 'All notifications marked as read', data });
});

const listSupport = asyncHandler(async (req, res) => {
  const data = await customerPortalService.listSupport(req.customer._id, req.query);
  res.json({ success: true, message: 'Support tickets retrieved', data });
});

const getSupport = asyncHandler(async (req, res) => {
  const ticket = await customerPortalService.getSupport(req.customer._id, req.params.id);
  res.json({ success: true, message: 'Support ticket retrieved', data: { ticket } });
});

const createSupport = asyncHandler(async (req, res) => {
  const ticket = await customerPortalService.createSupport(
    req.customer,
    req.user,
    req.body,
    req
  );
  res.status(201).json({ success: true, message: 'Support ticket created', data: { ticket } });
});

const replySupport = asyncHandler(async (req, res) => {
  const ticket = await customerPortalService.replySupport(
    req.customer._id,
    req.params.id,
    req.user,
    req.body.message,
    req
  );
  res.json({ success: true, message: 'Reply added', data: { ticket } });
});

const listAddresses = asyncHandler(async (req, res) => {
  const data = await customerPortalService.getAddresses(req.customer._id);
  res.json({ success: true, message: 'Addresses retrieved', data });
});

const addAddress = asyncHandler(async (req, res) => {
  const data = await customerPortalService.addAddress(req.customer._id, req.body);
  res.status(201).json({ success: true, message: 'Address saved', data });
});

const deleteAddress = asyncHandler(async (req, res) => {
  const data = await customerPortalService.deleteAddress(req.customer._id, req.params.id);
  res.json({ success: true, message: 'Address deleted', data });
});

module.exports = {
  register,
  getProfile,
  updateProfile,
  getDashboard,
  listProducts,
  getProduct,
  listOrders,
  getOrder,
  placeOrder,
  listInvoices,
  getInvoice,
  downloadInvoicePdf,
  listPayments,
  listNotifications,
  unreadNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  listSupport,
  getSupport,
  createSupport,
  replySupport,
  listAddresses,
  addAddress,
  deleteAddress,
};

