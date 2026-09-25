/**
 * Bulk demo data loader — inserts 500+ time-varied operational records.
 * Safe to re-run: skips if BULK_SEED_MARKER already exists unless --force.
 *
 * Usage:
 *   npm run seed:bulk
 *   npm run seed:bulk -- --force
 *   npm run seed:bulk -- --count=600
 *
 * Requires base seed first: npm run seed
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const mongoose = require('mongoose');
const config = require('../src/config/env');
const { connectDatabase, disconnectDatabase } = require('../src/config/db');
const logger = require('../src/utils/logger');

const Product = require('../src/models/Product');
const Category = require('../src/models/Category');
const Warehouse = require('../src/models/Warehouse');
const Customer = require('../src/models/Customer');
const SalesOrder = require('../src/models/SalesOrder');
const Invoice = require('../src/models/Invoice');
const Payment = require('../src/models/Payment');
const Lead = require('../src/models/Lead');
const Notification = require('../src/models/Notification');
const SupportTicket = require('../src/models/SupportTicket');
const User = require('../src/models/User');
const AuditLog = require('../src/models/AuditLog');

const MARKER_CODE = 'BULK_SEED_MARKER';

const CITIES = [
  'Mumbai',
  'Pune',
  'Ahmedabad',
  'Bengaluru',
  'Chennai',
  'Hyderabad',
  'Delhi',
  'Jaipur',
  'Surat',
  'Indore',
];
const STATES = [
  'Maharashtra',
  'Gujarat',
  'Karnataka',
  'Tamil Nadu',
  'Telangana',
  'Delhi',
  'Rajasthan',
  'Madhya Pradesh',
];
const COMPANIES = [
  'Nova Traders',
  'Bright Retail',
  'City Electronics',
  'Orbit Supplies',
  'Pixel Mart',
  'Harbor Goods',
  'Summit Commerce',
  'Lotus Distributors',
  'Aether Tech',
  'Vertex Wholesale',
];
const FIRST = ['Aarav', 'Diya', 'Kabir', 'Ananya', 'Rohan', 'Isha', 'Vivaan', 'Meera', 'Arjun', 'Sara'];
const LAST = ['Shah', 'Patel', 'Mehta', 'Desai', 'Khan', 'Iyer', 'Nair', 'Gupta', 'Reddy', 'Joshi'];
const PRODUCT_NAMES = [
  'Wireless Keyboard',
  'Bluetooth Speaker',
  'USB Drive 64GB',
  'HDMI Cable',
  'Webcam HD',
  'Monitor Stand',
  'Laptop Sleeve',
  'Power Bank 20K',
  'Smart Watch Band',
  'Noise Cancelling Buds',
  'Desk Lamp LED',
  'Ergo Mouse Pad',
  'Type-C Dock',
  'SSD 1TB',
  'RAM 16GB Kit',
];
const BRANDS = ['NovaTech', 'LogiTech', 'Anker', 'Samsung', 'Sony', 'Dell', 'HP', 'Boat'];
const SO_STATUSES = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
const PAY_METHODS = ['UPI', 'BANK_TRANSFER', 'CARD', 'CASH', 'CHEQUE'];
const LEAD_SOURCES = ['WEBSITE', 'REFERRAL', 'COLD_CALL', 'EMAIL', 'EVENT', 'OTHER'];
const LEAD_STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST'];
const SUPPORT_CATS = ['ORDER', 'INVOICE', 'PAYMENT', 'PRODUCT', 'DELIVERY', 'TECHNICAL', 'OTHER'];

function parseArgs() {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const countArg = args.find((a) => a.startsWith('--count='));
  const target = countArg ? Math.max(500, parseInt(countArg.split('=')[1], 10) || 500) : 550;
  return { force, target };
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

/** Spread dates across the last ~12 months for chart-friendly series */
function randomPastDate(daysBack = 365) {
  const now = Date.now();
  const offset = randInt(0, daysBack) * 24 * 60 * 60 * 1000;
  const hour = randInt(8, 20);
  const d = new Date(now - offset);
  d.setHours(hour, randInt(0, 59), randInt(0, 59), 0);
  return d;
}

function calcLine(product, qty) {
  const unitPrice = product.sellingPrice;
  const taxPercent = product.taxPercent || 18;
  const discount = Math.random() < 0.15 ? round2(unitPrice * qty * 0.05) : 0;
  const base = unitPrice * qty - discount;
  const tax = (base * taxPercent) / 100;
  return {
    product: product._id,
    quantity: qty,
    unitPrice,
    taxPercent,
    discount,
    lineTotal: round2(base + tax),
    baseAmount: round2(base),
    taxAmount: round2(tax),
  };
}

function totalsFromLines(lines) {
  const subtotal = round2(lines.reduce((s, l) => s + l.baseAmount, 0));
  const taxTotal = round2(lines.reduce((s, l) => s + l.taxAmount, 0));
  return {
    items: lines.map(({ product, quantity, unitPrice, taxPercent, discount, lineTotal }) => ({
      product,
      quantity,
      unitPrice,
      taxPercent,
      discount,
      lineTotal,
    })),
    subtotal,
    taxTotal,
    grandTotal: round2(subtotal + taxTotal),
  };
}

async function ensureMarker(force) {
  const existing = await AuditLog.findOne({ action: MARKER_CODE }).lean();
  if (existing && !force) {
    return false;
  }
  if (existing && force) {
    await AuditLog.deleteMany({ action: MARKER_CODE });
  }
  return true;
}

async function writeMarker(counts) {
  await AuditLog.create({
    user: null,
    action: MARKER_CODE,
    module: 'SEED',
    recordId: 'bulk',
    metadata: { counts, at: new Date().toISOString() },
  });
}

async function seedExtraProducts(warehouse, categories, count) {
  const cats = categories.length ? categories : [null];
  const docs = [];
  const stamp = Date.now().toString(36).toUpperCase();

  for (let i = 1; i <= count; i += 1) {
    const name = `${pick(PRODUCT_NAMES)} ${i}`;
    const purchase = randInt(200, 8000);
    docs.push({
      name,
      sku: `BLK-${stamp}-${String(i).padStart(4, '0')}`,
      category: pick(cats)?._id || null,
      brand: pick(BRANDS),
      description: `Bulk demo SKU for ${name}. Suitable for customer catalog.`,
      purchasePrice: purchase,
      sellingPrice: round2(purchase * (1.3 + Math.random() * 0.5)),
      taxPercent: 18,
      currentStock: randInt(5, 200),
      minimumStock: 5,
      maximumStock: 500,
      unit: 'PCS',
      warehouse: warehouse?._id || null,
      status: 'ACTIVE',
      visibleToCustomers: Math.random() > 0.08,
      imageUrl: `https://picsum.photos/seed/erp-${stamp}-${i}/600/450`,
    });
  }

  const inserted = await Product.insertMany(docs, { ordered: false });
  return inserted;
}

async function seedExtraCustomers(count) {
  const docs = [];
  const stamp = Date.now().toString(36).toUpperCase();

  for (let i = 1; i <= count; i += 1) {
    const first = pick(FIRST);
    const last = pick(LAST);
    const company = pick(COMPANIES);
    docs.push({
      code: `CUST-BLK-${stamp}-${String(i).padStart(4, '0')}`,
      name: `${first} ${last}`,
      email: `${first.toLowerCase()}.${last.toLowerCase()}.${i}@bulk.example`,
      phone: `98${String(randInt(10000000, 99999999))}`,
      company: `${company} ${i}`,
      city: pick(CITIES),
      state: pick(STATES),
      country: 'India',
      pincode: String(randInt(110001, 899999)),
      gstin: Math.random() > 0.4 ? `22AAAAA${String(1000 + i).slice(-4)}A1Z5` : '',
      billingAddress: `${randInt(1, 99)}, Industrial Road`,
      shippingAddress: `${randInt(1, 99)}, Industrial Road`,
      status: Math.random() > 0.05 ? 'ACTIVE' : 'INACTIVE',
      creditLimit: randInt(0, 5) * 50000,
    });
  }

  return Customer.insertMany(docs, { ordered: false });
}

async function seedCommerceBundle({
  customers,
  products,
  warehouse,
  salesUser,
  portalCustomer,
  orderCount,
}) {
  const orders = [];
  const invoices = [];
  const payments = [];
  const stamp = Date.now().toString(36).toUpperCase();

  for (let i = 1; i <= orderCount; i += 1) {
    // Bias ~25% of orders to the portal demo customer for rich portal charts
    const customer =
      portalCustomer && Math.random() < 0.25
        ? portalCustomer
        : pick(customers);
    const orderDate = randomPastDate(340);
    const lineCount = randInt(1, 3);
    const lines = [];
    for (let L = 0; L < lineCount; L += 1) {
      lines.push(calcLine(pick(products), randInt(1, 8)));
    }
    const { items, subtotal, taxTotal, grandTotal } = totalsFromLines(lines);
    const status = pick(SO_STATUSES);
    const orderNumber = `SO-BLK-${stamp}-${String(i).padStart(5, '0')}`;

    const orderId = new mongoose.Types.ObjectId();
    const invoiceId =
      status !== 'CANCELLED' && status !== 'DRAFT' && Math.random() > 0.2
        ? new mongoose.Types.ObjectId()
        : null;

    orders.push({
      _id: orderId,
      orderNumber,
      customer: customer._id,
      warehouse: warehouse?._id || null,
      orderDate,
      deliveryDate: status === 'DELIVERED' ? new Date(orderDate.getTime() + 5 * 86400000) : null,
      status,
      items,
      subtotal,
      taxTotal,
      grandTotal,
      notes: 'Bulk seed order',
      salesperson: salesUser?._id || null,
      createdBy: salesUser?._id || null,
      confirmedAt: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(status)
        ? orderDate
        : null,
      stockReserved: false,
      invoice: invoiceId,
      createdAt: orderDate,
      updatedAt: orderDate,
    });

    if (invoiceId) {
      const dueDate = new Date(orderDate.getTime() + 15 * 86400000);
      const payRoll = Math.random();
      let paidAmount = 0;
      let paymentStatus = 'UNPAID';
      if (payRoll > 0.55) {
        paidAmount = grandTotal;
        paymentStatus = 'PAID';
      } else if (payRoll > 0.35) {
        paidAmount = round2(grandTotal * 0.5);
        paymentStatus = 'PARTIALLY_PAID';
      } else if (dueDate < new Date()) {
        paymentStatus = 'OVERDUE';
      }

      invoices.push({
        _id: invoiceId,
        invoiceNumber: `INV-BLK-${stamp}-${String(i).padStart(5, '0')}`,
        customer: customer._id,
        salesOrder: orderId,
        invoiceDate: orderDate,
        dueDate,
        items: items.map((it) => ({
          product: it.product,
          description: '',
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          taxPercent: it.taxPercent,
          discount: it.discount,
          lineTotal: it.lineTotal,
        })),
        subtotal,
        taxTotal,
        grandTotal,
        paidAmount,
        balanceAmount: round2(grandTotal - paidAmount),
        paymentStatus,
        status: 'ISSUED',
        notes: 'Bulk seed invoice',
        createdBy: salesUser?._id || null,
        createdAt: orderDate,
        updatedAt: orderDate,
      });

      if (paidAmount > 0) {
        payments.push({
          paymentNumber: `PAY-BLK-${stamp}-${String(i).padStart(5, '0')}`,
          invoice: invoiceId,
          customer: customer._id,
          amount: paidAmount,
          method: pick(PAY_METHODS),
          paymentDate: new Date(orderDate.getTime() + randInt(1, 10) * 86400000),
          referenceNumber: `TXN${randInt(100000, 999999)}`,
          notes: 'Bulk seed payment',
          createdBy: salesUser?._id || null,
        });
      }
    }
  }

  await SalesOrder.insertMany(orders, { ordered: false });
  if (invoices.length) await Invoice.insertMany(invoices, { ordered: false });
  if (payments.length) await Payment.insertMany(payments, { ordered: false });

  return {
    orders: orders.length,
    invoices: invoices.length,
    payments: payments.length,
  };
}

async function seedLeads(salesUser, count) {
  if (!salesUser) return 0;
  const stamp = Date.now().toString(36).toUpperCase();
  const docs = [];
  for (let i = 1; i <= count; i += 1) {
    const createdAt = randomPastDate(200);
    docs.push({
      code: `LEAD-BLK-${stamp}-${String(i).padStart(4, '0')}`,
      name: `${pick(FIRST)} ${pick(LAST)}`,
      company: pick(COMPANIES),
      email: `lead.${i}.${stamp.toLowerCase()}@example.com`,
      phone: `97${String(randInt(10000000, 99999999))}`,
      source: pick(LEAD_SOURCES),
      status: pick(LEAD_STATUSES),
      estimatedValue: randInt(1, 40) * 25000,
      notes: 'Bulk CRM lead',
      owner: salesUser._id,
      createdBy: salesUser._id,
      createdAt,
      updatedAt: createdAt,
    });
  }
  await Lead.insertMany(docs, { ordered: false });
  return docs.length;
}

async function seedNotifications(users, count) {
  if (!users.length) return 0;
  const titles = [
    'Order confirmed',
    'Invoice generated',
    'Payment received',
    'Shipment update',
    'Support reply',
    'Low stock alert',
    'Welcome',
  ];
  const docs = [];
  for (let i = 0; i < count; i += 1) {
    const createdAt = randomPastDate(90);
    docs.push({
      user: pick(users)._id,
      title: pick(titles),
      message: `Bulk notification #${i + 1}: status update for your account activity.`,
      type: pick(['INFO', 'SUCCESS', 'WARNING']),
      module: pick(['SALES', 'CUSTOMER_PORTAL', 'INVENTORY', 'SYSTEM']),
      link: '/customer/notifications',
      status: Math.random() > 0.45 ? 'UNREAD' : 'READ',
      createdAt,
      updatedAt: createdAt,
    });
  }
  await Notification.insertMany(docs, { ordered: false });
  return docs.length;
}

async function seedSupport(portalCustomer, portalUser, count) {
  if (!portalCustomer || !portalUser) return 0;
  const stamp = Date.now().toString(36).toUpperCase();
  const docs = [];
  for (let i = 1; i <= count; i += 1) {
    const createdAt = randomPastDate(120);
    docs.push({
      ticketNumber: `TKT-BLK-${stamp}-${String(i).padStart(4, '0')}`,
      customer: portalCustomer._id,
      createdBy: portalUser._id,
      subject: `Bulk inquiry ${i}: ${pick(['delivery delay', 'invoice copy', 'product info', 'payment status'])}`,
      category: pick(SUPPORT_CATS),
      priority: pick(['LOW', 'MEDIUM', 'HIGH']),
      status: pick(['OPEN', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'RESOLVED', 'CLOSED']),
      relatedOrderNumber: '',
      messages: [
        {
          authorType: 'CUSTOMER',
          author: portalUser._id,
          message: `Hello, this is bulk support message ${i}. Please advise.`,
          createdAt,
        },
      ],
      createdAt,
      updatedAt: createdAt,
    });
  }
  await SupportTicket.insertMany(docs, { ordered: false });
  return docs.length;
}

async function run() {
  const { force, target } = parseArgs();

  if (!config.mongodbUri || config.mongodbUri.includes('<user>')) {
    throw new Error('Configure a real MONGODB_URI before bulk seeding');
  }

  await connectDatabase();
  logger.info(`Bulk seed starting (target ≥ ${target} docs, force=${force})…`);

  const canRun = await ensureMarker(force);
  if (!canRun) {
    logger.info('Bulk seed already applied. Use --force to insert another batch.');
    await disconnectDatabase();
    process.exit(0);
  }

  const warehouse = await Warehouse.findOne({ code: 'MAIN' });
  const categories = await Category.find({ isActive: true }).limit(20);
  let products = await Product.find({ status: 'ACTIVE' }).limit(200);
  let customers = await Customer.find({ status: 'ACTIVE' }).limit(300);
  const salesUser = await User.findOne({ email: 'sales@erp.local' });
  const portalUser = await User.findOne({ email: 'customer@erp.local' });
  const portalCustomer = await Customer.findOne({ code: 'CUST-PORTAL' });
  const staffUsers = await User.find({ email: /@erp\.local$/i }).limit(20);

  if (!products.length || !customers.length) {
    throw new Error('Run `npm run seed` first so base products/customers exist.');
  }

  // Allocate volume toward 500+ total new documents
  const productCount = 60;
  const customerCount = 80;
  const orderCount = Math.max(220, Math.ceil(target * 0.4));
  const leadCount = 80;
  const notificationCount = 120;
  const supportCount = 40;

  const newProducts = await seedExtraProducts(warehouse, categories, productCount);
  products = [...products, ...newProducts];
  logger.info(`Products added: ${newProducts.length}`);

  const newCustomers = await seedExtraCustomers(customerCount);
  customers = [...customers, ...newCustomers];
  logger.info(`Customers added: ${newCustomers.length}`);

  const commerce = await seedCommerceBundle({
    customers,
    products,
    warehouse,
    salesUser,
    portalCustomer,
    orderCount,
  });
  logger.info(
    `Commerce added: ${commerce.orders} orders, ${commerce.invoices} invoices, ${commerce.payments} payments`
  );

  const leads = await seedLeads(salesUser, leadCount);
  logger.info(`Leads added: ${leads}`);

  const notifyUsers = portalUser ? [...staffUsers, portalUser] : staffUsers;
  const notifications = await seedNotifications(notifyUsers, notificationCount);
  logger.info(`Notifications added: ${notifications}`);

  const tickets = await seedSupport(portalCustomer, portalUser, supportCount);
  logger.info(`Support tickets added: ${tickets}`);

  const counts = {
    products: newProducts.length,
    customers: newCustomers.length,
    orders: commerce.orders,
    invoices: commerce.invoices,
    payments: commerce.payments,
    leads,
    notifications,
    supportTickets: tickets,
  };
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  await writeMarker(counts);
  logger.info(`Bulk seed complete — ${total} documents inserted`, { counts });

  await disconnectDatabase();
  process.exit(0);
}

run().catch(async (error) => {
  logger.error('Bulk seed failed', { message: error.message, stack: error.stack });
  try {
    await disconnectDatabase();
  } catch (_) {
    /* ignore */
  }
  process.exit(1);
});
