const PDFDocument = require('pdfkit');
const User = require('../models/User');
const Role = require('../models/Role');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const SalesOrder = require('../models/SalesOrder');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const SupportTicket = require('../models/SupportTicket');
const AppError = require('../utils/AppError');
const { parseListQuery, buildPagedResult } = require('../utils/pagination');
const { writeAuditLog } = require('./auditService');
const { createNotification } = require('./notificationService');
const { sendEmail } = require('./mailService');
const { nextDocumentNumber, calcOrderTotals } = require('../utils/documentHelpers');
const { signToken } = require('../utils/jwt');
const { ROLES } = require('../constants/roles');
const config = require('../config/env');
const { welcomeEmailTemplate } = require('../templates/emailTemplates');

function sanitizeUser(user) {
  const obj = user.toObject ? user.toObject() : { ...user };
  delete obj.password;
  delete obj.resetPasswordToken;
  delete obj.resetPasswordExpires;
  delete obj.__v;
  return obj;
}

function buildAuthPayload(user) {
  return {
    token: signToken({ sub: user._id.toString(), role: user.role?.name }),
    user: sanitizeUser(user),
  };
}

function resolveImageUrl(rawImage) {
  if (!rawImage) return '';
  if (/^https?:\/\//i.test(rawImage)) return rawImage;
  const origin = (config.apiPublicUrl || `http://localhost:${config.port || 5000}`).replace(/\/$/, '');
  return rawImage.startsWith('/') ? `${origin}${rawImage}` : `${origin}/${rawImage}`;
}

function publicProduct(doc) {
  const p = doc.toObject ? doc.toObject({ virtuals: true }) : doc;
  return {
    _id: p._id,
    name: p.name,
    sku: p.sku,
    brand: p.brand || '',
    description: p.description || '',
    category: p.category,
    unit: p.unit,
    sellingPrice: p.sellingPrice,
    taxPercent: p.taxPercent,
    imageUrl: resolveImageUrl(p.imageUrl || ''),
    availability:
      p.currentStock <= 0 ? 'OUT_OF_STOCK' : p.currentStock <= (p.minimumStock || 0) ? 'LIMITED' : 'IN_STOCK',
    status: p.status,
  };
}

async function registerCustomer(payload, req) {
  const email = payload.email.toLowerCase();
  const existing = await User.findOne({ email });
  if (existing) throw AppError.conflict('An account with this email already exists', 'EMAIL_EXISTS');

  const role = await Role.findOne({ name: ROLES.CUSTOMER, isActive: true });
  if (!role) throw AppError.badRequest('Customer role is not available. Run seed.', 'ROLE_NOT_FOUND');

  const user = await User.create({
    firstName: payload.firstName,
    lastName: payload.lastName,
    email,
    password: payload.password,
    phone: payload.phone || '',
    role: role._id,
    status: 'ACTIVE',
  });
  await user.populate('role');

  const code = await nextDocumentNumber(Customer, 'code', 'CUST');
  const customer = await Customer.create({
    code,
    name: `${payload.firstName} ${payload.lastName}`.trim(),
    email,
    phone: payload.phone || '',
    company: payload.company || '',
    billingAddress: payload.address || '',
    shippingAddress: payload.address || '',
    city: payload.city || '',
    state: payload.state || '',
    country: payload.country || 'India',
    pincode: payload.pincode || '',
    gstin: payload.gstin || '',
    status: 'ACTIVE',
    user: user._id,
  });

  await writeAuditLog({
    userId: user._id,
    action: 'CUSTOMER_REGISTERED',
    module: 'CUSTOMER_PORTAL',
    recordId: customer._id.toString(),
    metadata: { code },
    req,
  });

  sendEmail({
    to: email,
    subject: 'Welcome to the Customer Portal',
    html: welcomeEmailTemplate({
      name: user.fullName,
      loginUrl: `${config.clientUrl}/login`,
    }),
  });

  createNotification({
    userId: user._id,
    title: 'Welcome',
    message: 'Your customer portal account is ready.',
    type: 'SUCCESS',
    module: 'CUSTOMER_PORTAL',
    link: '/customer/dashboard',
  });

  return { ...buildAuthPayload(user), customer };
}

async function getProfile(customer, user) {
  return {
    user: sanitizeUser(user),
    customer,
  };
}

async function updateProfile(customer, user, payload, req) {
  const fields = [
    'phone',
    'company',
    'billingAddress',
    'shippingAddress',
    'city',
    'state',
    'country',
    'pincode',
    'gstin',
  ];
  fields.forEach((f) => {
    if (payload[f] !== undefined) customer[f] = payload[f];
  });
  if (payload.name) customer.name = payload.name;
  if (payload.address && !payload.billingAddress) customer.billingAddress = payload.address;

  if (payload.firstName) user.firstName = payload.firstName;
  if (payload.lastName) user.lastName = payload.lastName;
  if (payload.phone !== undefined) user.phone = payload.phone;
  if (payload.firstName || payload.lastName) {
    customer.name = `${user.firstName} ${user.lastName}`.trim();
  }

  await customer.save();
  await user.save();

  await writeAuditLog({
    userId: user._id,
    action: 'CUSTOMER_PROFILE_UPDATED',
    module: 'CUSTOMER_PORTAL',
    recordId: customer._id.toString(),
    req,
  });

  return getProfile(customer, user);
}

async function getDashboard(customerId) {
  const confirmed = ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
  const [
    totalOrders,
    pendingOrders,
    completedOrders,
    invoiceAgg,
    paymentAgg,
    monthlyOrders,
    monthlySpend,
  ] = await Promise.all([
    SalesOrder.countDocuments({ customer: customerId }),
    SalesOrder.countDocuments({
      customer: customerId,
      status: { $in: ['DRAFT', 'PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED'] },
    }),
    SalesOrder.countDocuments({ customer: customerId, status: 'DELIVERED' }),
    Invoice.aggregate([
      { $match: { customer: customerId, status: { $ne: 'CANCELLED' } } },
      {
        $group: {
          _id: null,
          invoiced: { $sum: '$grandTotal' },
          outstanding: { $sum: '$balanceAmount' },
        },
      },
    ]),
    Payment.aggregate([
      { $match: { customer: customerId } },
      { $group: { _id: null, paid: { $sum: '$amount' } } },
    ]),
    SalesOrder.aggregate([
      {
        $match: {
          customer: customerId,
          status: { $in: confirmed },
          orderDate: { $gte: new Date(new Date().getFullYear(), 0, 1) },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$orderDate' } },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Invoice.aggregate([
      {
        $match: {
          customer: customerId,
          status: { $ne: 'CANCELLED' },
          invoiceDate: { $gte: new Date(new Date().getFullYear(), 0, 1) },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$invoiceDate' } },
          amount: { $sum: '$grandTotal' },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  return {
    kpis: {
      totalOrders,
      pendingOrders,
      completedOrders,
      totalInvoiced: invoiceAgg[0]?.invoiced || 0,
      totalPaid: paymentAgg[0]?.paid || 0,
      outstanding: invoiceAgg[0]?.outstanding || 0,
    },
    charts: {
      monthlyOrders: monthlyOrders.map((r) => ({ month: r._id, orders: r.orders })),
      monthlySpending: monthlySpend.map((r) => ({ month: r._id, amount: r.amount })),
    },
  };
}

async function listCatalog(query) {
  const { page, limit, skip, search, sort } = parseListQuery(query);
  const filter = { status: 'ACTIVE', visibleToCustomers: true };
  if (query.category) filter.category = query.category;
  if (query.minPrice || query.maxPrice) {
    filter.sellingPrice = {};
    if (query.minPrice) filter.sellingPrice.$gte = Number(query.minPrice);
    if (query.maxPrice) filter.sellingPrice.$lte = Number(query.maxPrice);
  }
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { sku: { $regex: search, $options: 'i' } },
      { brand: { $regex: search, $options: 'i' } },
    ];
  }

  const [items, total] = await Promise.all([
    Product.find(filter)
      .populate('category', 'name code')
      .sort(sort || { name: 1 })
      .skip(skip)
      .limit(limit),
    Product.countDocuments(filter),
  ]);

  return buildPagedResult({
    items: items.map(publicProduct),
    total,
    page,
    limit,
  });
}

async function getCatalogProduct(id) {
  const product = await Product.findOne({
    _id: id,
    status: 'ACTIVE',
    visibleToCustomers: true,
  }).populate('category', 'name code');
  if (!product) throw AppError.notFound('Product not found', 'PRODUCT_NOT_FOUND');
  return publicProduct(product);
}

/**
 * Customer places an order for their own linked Customer party.
 * Creates a PENDING sales order after validating catalog visibility + stock.
 */
async function placeOrder(customer, user, payload, req) {
  if (!Array.isArray(payload.items) || !payload.items.length) {
    throw AppError.badRequest('Add at least one product to place an order', 'EMPTY_CART');
  }

  const lines = [];
  for (const line of payload.items) {
    const qty = Number(line.quantity);
    if (!line.product || !Number.isFinite(qty) || qty < 1) {
      throw AppError.badRequest('Each item needs a product and quantity ≥ 1', 'INVALID_ITEM');
    }

    const product = await Product.findOne({
      _id: line.product,
      status: 'ACTIVE',
      visibleToCustomers: true,
    });
    if (!product) {
      throw AppError.badRequest('One or more products are not available for purchase', 'PRODUCT_UNAVAILABLE');
    }
    if (product.currentStock < qty) {
      throw AppError.badRequest(
        `Insufficient stock for ${product.name} (${product.sku}). Available: ${product.currentStock}`,
        'INSUFFICIENT_STOCK'
      );
    }

    lines.push({
      product: product._id,
      quantity: qty,
      unitPrice: product.sellingPrice,
      taxPercent: product.taxPercent || 0,
      discount: 0,
      name: product.name,
      sku: product.sku,
    });
  }

  const totals = calcOrderTotals(lines);
  const orderNumber = await nextDocumentNumber(SalesOrder, 'orderNumber', 'SO');
  const Warehouse = require('../models/Warehouse');
  const defaultWh = await Warehouse.findOne({ isDefault: true, isActive: true });

  const shippingAddress = payload.shippingAddress || {
    name: customer.name || `${user.firstName} ${user.lastName}`,
    phone: customer.phone || user.phone || '',
    addressLine: customer.shippingAddress || customer.billingAddress || 'Office / Factory Address',
    city: customer.city || '',
    state: customer.state || '',
    pincode: customer.pincode || '',
    country: customer.country || 'India',
  };

  const paymentMethod = payload.paymentMethod || 'COD';
  const paymentStatus = paymentMethod === 'COD' ? 'COD' : 'PAID';
  const paymentDetails = payload.paymentDetails || {};

  // If saveAddress requested or customer has no saved addresses, automatically save
  if (payload.saveAddress || !customer.savedAddresses || customer.savedAddresses.length === 0) {
    if (!customer.savedAddresses) customer.savedAddresses = [];
    const alreadySaved = customer.savedAddresses.some(
      (a) =>
        a.addressLine?.trim() === shippingAddress.addressLine?.trim() &&
        a.pincode?.trim() === shippingAddress.pincode?.trim()
    );
    if (!alreadySaved && shippingAddress.addressLine) {
      customer.savedAddresses.push({
        name: shippingAddress.name,
        phone: shippingAddress.phone,
        addressLine: shippingAddress.addressLine,
        city: shippingAddress.city,
        state: shippingAddress.state,
        pincode: shippingAddress.pincode,
        country: shippingAddress.country || 'India',
        isDefault: customer.savedAddresses.length === 0,
      });
      if (!customer.shippingAddress) {
        customer.shippingAddress = shippingAddress.addressLine;
        customer.city = shippingAddress.city;
        customer.state = shippingAddress.state;
        customer.pincode = shippingAddress.pincode;
      }
      await customer.save();
    }
  }

  const so = await SalesOrder.create({
    orderNumber,
    customer: customer._id,
    warehouse: defaultWh?._id || null,
    orderDate: new Date(),
    status: 'PENDING',
    items: totals.items,
    subtotal: totals.subtotal,
    taxTotal: totals.taxTotal,
    grandTotal: totals.grandTotal,
    shippingAddress,
    paymentMethod,
    paymentStatus,
    paymentDetails,
    notes: payload.notes || 'Placed via customer portal',
    createdBy: user._id,
    salesperson: null,
  });

  await writeAuditLog({
    userId: user._id,
    action: 'CUSTOMER_ORDER_PLACED',
    module: 'CUSTOMER_PORTAL',
    recordId: so._id.toString(),
    metadata: { orderNumber, grandTotal: so.grandTotal, itemCount: lines.length },
    req,
  });

  createNotification({
    userId: user._id,
    title: 'Order placed',
    message: `${orderNumber} for ₹${so.grandTotal.toLocaleString('en-IN')} was submitted successfully.`,
    type: 'SUCCESS',
    module: 'CUSTOMER_PORTAL',
    link: `/customer/orders/${so._id}`,
  });

  sendEmail({
    to: customer.email || user.email,
    subject: `Order ${orderNumber} received`,
    html: `<p>Hi ${customer.name || user.firstName},</p>
      <p>We received your order <strong>${orderNumber}</strong>.</p>
      <p>Total: <strong>₹${Number(so.grandTotal).toLocaleString('en-IN')}</strong></p>
      <p>Status: Pending confirmation. You can track it in the customer portal.</p>`,
  });

  return getOrder(customer._id, so._id);
}

async function listOrders(customerId, query) {
  const { page, limit, skip, search, sort, status } = parseListQuery(query);
  const filter = { customer: customerId };
  if (status) filter.status = status.toUpperCase();
  if (search) filter.orderNumber = { $regex: search, $options: 'i' };
  if (query.from || query.to) {
    filter.orderDate = {};
    if (query.from) filter.orderDate.$gte = new Date(query.from);
    if (query.to) filter.orderDate.$lte = new Date(query.to);
  }

  const [items, total] = await Promise.all([
    SalesOrder.find(filter)
      .populate('invoice', 'invoiceNumber paymentStatus')
      .populate('items.product', 'name sku')
      .sort(sort || { orderDate: -1 })
      .skip(skip)
      .limit(limit),
    SalesOrder.countDocuments(filter),
  ]);
  return buildPagedResult({ items, total, page, limit });
}

async function getOrder(customerId, orderId) {
  const order = await SalesOrder.findOne({ _id: orderId, customer: customerId })
    .populate('customer', 'name code email phone billingAddress shippingAddress city')
    .populate('invoice', 'invoiceNumber paymentStatus grandTotal')
    .populate('items.product', 'name sku unit');
  if (!order) throw AppError.notFound('Order not found', 'ORDER_NOT_FOUND');
  return order;
}

async function listInvoices(customerId, query) {
  const { page, limit, skip, search, sort } = parseListQuery(query);
  const filter = { customer: customerId };
  if (query.paymentStatus) filter.paymentStatus = query.paymentStatus.toUpperCase();
  if (search) filter.invoiceNumber = { $regex: search, $options: 'i' };

  const [items, total] = await Promise.all([
    Invoice.find(filter)
      .populate('salesOrder', 'orderNumber status')
      .sort(sort || { invoiceDate: -1 })
      .skip(skip)
      .limit(limit),
    Invoice.countDocuments(filter),
  ]);
  return buildPagedResult({ items, total, page, limit });
}

async function getInvoice(customerId, invoiceId) {
  const invoice = await Invoice.findOne({ _id: invoiceId, customer: customerId })
    .populate('customer', 'name code email phone billingAddress city gstin')
    .populate('salesOrder', 'orderNumber')
    .populate('items.product', 'name sku');
  if (!invoice) throw AppError.notFound('Invoice not found', 'INVOICE_NOT_FOUND');
  return invoice;
}

function buildInvoicePdfBuffer(invoice) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(18).text('TAX INVOICE', { align: 'center' });
    doc.moveDown();
    doc.fontSize(11).text(`Invoice #: ${invoice.invoiceNumber}`);
    doc.text(`Date: ${new Date(invoice.invoiceDate).toLocaleDateString()}`);
    if (invoice.dueDate) doc.text(`Due: ${new Date(invoice.dueDate).toLocaleDateString()}`);
    doc.moveDown();
    doc.text(`Bill To: ${invoice.customer?.name || ''}`);
    if (invoice.customer?.billingAddress) doc.text(invoice.customer.billingAddress);
    if (invoice.customer?.gstin) doc.text(`GSTIN: ${invoice.customer.gstin}`);
    doc.moveDown();
    doc.text('Items:');
    (invoice.items || []).forEach((line, i) => {
      const name = line.product?.name || line.description || `Item ${i + 1}`;
      doc.text(
        `${i + 1}. ${name}  Qty ${line.quantity} × ₹${line.unitPrice} = ₹${line.lineTotal}`
      );
    });
    doc.moveDown();
    doc.text(`Subtotal: ₹${invoice.subtotal}`);
    doc.text(`Tax: ₹${invoice.taxTotal}`);
    doc.fontSize(12).text(`Grand Total: ₹${invoice.grandTotal}`, { underline: true });
    doc.text(`Payment Status: ${invoice.paymentStatus}`);
    doc.end();
  });
}

async function getInvoicePdf(customerId, invoiceId, userId, req) {
  const invoice = await getInvoice(customerId, invoiceId);
  const buffer = await buildInvoicePdfBuffer(invoice);
  await writeAuditLog({
    userId,
    action: 'CUSTOMER_INVOICE_PDF',
    module: 'CUSTOMER_PORTAL',
    recordId: invoiceId,
    metadata: { invoiceNumber: invoice.invoiceNumber },
    req,
  });
  return { buffer, filename: `${invoice.invoiceNumber}.pdf` };
}

async function listPayments(customerId, query) {
  const { page, limit, skip, search, sort } = parseListQuery(query);
  const filter = { customer: customerId };
  if (search) {
    filter.$or = [
      { paymentNumber: { $regex: search, $options: 'i' } },
      { referenceNumber: { $regex: search, $options: 'i' } },
    ];
  }

  const [items, total] = await Promise.all([
    Payment.find(filter)
      .populate('invoice', 'invoiceNumber paymentStatus')
      .sort(sort || { paymentDate: -1 })
      .skip(skip)
      .limit(limit),
    Payment.countDocuments(filter),
  ]);
  return buildPagedResult({ items, total, page, limit });
}

async function listSupport(customerId, query) {
  const { page, limit, skip, search, sort, status } = parseListQuery(query);
  const filter = { customer: customerId };
  if (status) filter.status = status.toUpperCase();
  if (search) {
    filter.$or = [
      { ticketNumber: { $regex: search, $options: 'i' } },
      { subject: { $regex: search, $options: 'i' } },
    ];
  }

  const [items, total] = await Promise.all([
    SupportTicket.find(filter).sort(sort || { updatedAt: -1 }).skip(skip).limit(limit),
    SupportTicket.countDocuments(filter),
  ]);
  return buildPagedResult({ items, total, page, limit });
}

async function getSupport(customerId, ticketId) {
  const ticket = await SupportTicket.findOne({ _id: ticketId, customer: customerId }).populate(
    'messages.author',
    'firstName lastName'
  );
  if (!ticket) throw AppError.notFound('Support ticket not found', 'TICKET_NOT_FOUND');
  return ticket;
}

async function createSupport(customer, user, payload, req) {
  const ticketNumber = await nextDocumentNumber(SupportTicket, 'ticketNumber', 'TKT');
  const ticket = await SupportTicket.create({
    ticketNumber,
    customer: customer._id,
    createdBy: user._id,
    subject: payload.subject,
    category: payload.category || 'OTHER',
    priority: payload.priority || 'MEDIUM',
    relatedOrderNumber: payload.relatedOrderNumber || '',
    status: 'OPEN',
    messages: [
      {
        authorType: 'CUSTOMER',
        author: user._id,
        message: payload.message,
      },
    ],
  });

  await writeAuditLog({
    userId: user._id,
    action: 'SUPPORT_CREATED',
    module: 'CUSTOMER_PORTAL',
    recordId: ticket._id.toString(),
    metadata: { ticketNumber },
    req,
  });

  createNotification({
    userId: user._id,
    title: 'Support request submitted',
    message: `${ticketNumber}: ${payload.subject}`,
    type: 'INFO',
    module: 'CUSTOMER_PORTAL',
    link: `/customer/support/${ticket._id}`,
  });

  sendEmail({
    to: customer.email || user.email,
    subject: `Support ticket ${ticketNumber} created`,
    html: `<p>Hi ${customer.name},</p><p>We received your request <strong>${ticketNumber}</strong>: ${payload.subject}</p>`,
  });

  return getSupport(customer._id, ticket._id);
}

async function replySupport(customerId, ticketId, user, message, req) {
  const ticket = await SupportTicket.findOne({ _id: ticketId, customer: customerId });
  if (!ticket) throw AppError.notFound('Support ticket not found', 'TICKET_NOT_FOUND');
  if (['RESOLVED', 'CLOSED'].includes(ticket.status)) {
    throw AppError.badRequest('Cannot reply to a closed ticket', 'TICKET_CLOSED');
  }

  ticket.messages.push({
    authorType: 'CUSTOMER',
    author: user._id,
    message,
  });
  if (ticket.status === 'WAITING_FOR_CUSTOMER') ticket.status = 'IN_PROGRESS';
  await ticket.save();

  await writeAuditLog({
    userId: user._id,
    action: 'SUPPORT_REPLY',
    module: 'CUSTOMER_PORTAL',
    recordId: ticketId,
    metadata: { ticketNumber: ticket.ticketNumber },
    req,
  });

  return getSupport(customerId, ticketId);
}

async function getAddresses(customerId) {
  const customer = await Customer.findById(customerId);
  if (!customer) throw AppError.notFound('Customer not found', 'CUSTOMER_NOT_FOUND');

  const saved = (customer.savedAddresses || []).map((addr) => ({
    _id: addr._id,
    name: addr.name || customer.name,
    phone: addr.phone || customer.phone,
    addressLine: addr.addressLine,
    city: addr.city,
    state: addr.state,
    pincode: addr.pincode,
    country: addr.country || 'India',
    isDefault: addr.isDefault || false,
  }));

  if (saved.length === 0 && (customer.shippingAddress || customer.billingAddress)) {
    saved.push({
      _id: 'profile_default',
      name: customer.name,
      phone: customer.phone,
      addressLine: customer.shippingAddress || customer.billingAddress,
      city: customer.city || '',
      state: customer.state || '',
      pincode: customer.pincode || '',
      country: customer.country || 'India',
      isDefault: true,
    });
  }

  return saved;
}

async function addAddress(customerId, payload) {
  const customer = await Customer.findById(customerId);
  if (!customer) throw AppError.notFound('Customer not found', 'CUSTOMER_NOT_FOUND');

  if (!customer.savedAddresses) customer.savedAddresses = [];

  if (payload.isDefault) {
    customer.savedAddresses.forEach((a) => {
      a.isDefault = false;
    });
  }

  customer.savedAddresses.push({
    name: payload.name,
    phone: payload.phone,
    addressLine: payload.addressLine,
    city: payload.city,
    state: payload.state,
    pincode: payload.pincode,
    country: payload.country || 'India',
    isDefault: Boolean(payload.isDefault || customer.savedAddresses.length === 0),
  });

  if (!customer.shippingAddress || payload.isDefault) {
    customer.shippingAddress = payload.addressLine;
    customer.city = payload.city;
    customer.state = payload.state;
    customer.pincode = payload.pincode;
  }

  await customer.save();
  return getAddresses(customerId);
}

async function deleteAddress(customerId, addressId) {
  const customer = await Customer.findById(customerId);
  if (!customer) throw AppError.notFound('Customer not found', 'CUSTOMER_NOT_FOUND');

  if (customer.savedAddresses) {
    customer.savedAddresses = customer.savedAddresses.filter(
      (a) => a._id?.toString() !== addressId
    );
    await customer.save();
  }

  return getAddresses(customerId);
}

module.exports = {
  registerCustomer,
  getProfile,
  updateProfile,
  getDashboard,
  listCatalog,
  getCatalogProduct,
  placeOrder,
  listOrders,
  getOrder,
  listInvoices,
  getInvoice,
  getInvoicePdf,
  listPayments,
  listSupport,
  getSupport,
  createSupport,
  replySupport,
  getAddresses,
  addAddress,
  deleteAddress,
};

