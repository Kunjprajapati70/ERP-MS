const SalesOrder = require('../models/SalesOrder');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const Product = require('../models/Product');

function parseDays(query, fallback = 30) {
  const days = Number(query.days || fallback);
  if (!Number.isFinite(days) || days < 1 || days > 365) return fallback;
  return Math.floor(days);
}

function sinceDays(days) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (days - 1));
  return d;
}

async function salesSummary(query = {}) {
  const days = parseDays(query, 30);
  const since = sinceDays(days);

  const [byStatus, daily, topProducts, totals] = await Promise.all([
    SalesOrder.aggregate([
      { $match: { orderDate: { $gte: since } } },
      { $group: { _id: '$status', count: { $sum: 1 }, revenue: { $sum: '$grandTotal' } } },
      { $sort: { count: -1 } },
    ]),
    SalesOrder.aggregate([
      {
        $match: {
          orderDate: { $gte: since },
          status: { $in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$orderDate' } },
          revenue: { $sum: '$grandTotal' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    SalesOrder.aggregate([
      {
        $match: {
          orderDate: { $gte: since },
          status: { $in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] },
        },
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          qty: { $sum: '$items.quantity' },
          revenue: { $sum: '$items.lineTotal' },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          productId: '$_id',
          sku: '$product.sku',
          name: '$product.name',
          qty: 1,
          revenue: 1,
        },
      },
    ]),
    SalesOrder.aggregate([
      {
        $match: {
          orderDate: { $gte: since },
          status: { $in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] },
        },
      },
      {
        $group: {
          _id: null,
          revenue: { $sum: '$grandTotal' },
          orders: { $sum: 1 },
          avgOrder: { $avg: '$grandTotal' },
        },
      },
    ]),
  ]);

  return {
    days,
    from: since.toISOString(),
    to: new Date().toISOString(),
    totals: {
      revenue: totals[0]?.revenue || 0,
      orders: totals[0]?.orders || 0,
      avgOrder: Math.round((totals[0]?.avgOrder || 0) * 100) / 100,
    },
    byStatus: byStatus.map((r) => ({ status: r._id, count: r.count, revenue: r.revenue })),
    daily: daily.map((r) => ({ date: r._id, revenue: r.revenue, orders: r.orders })),
    topProducts,
  };
}

async function receivablesReport() {
  const now = new Date();
  const invoices = await Invoice.find({
    status: { $ne: 'CANCELLED' },
    balanceAmount: { $gt: 0 },
  })
    .populate('customer', 'name code')
    .select('invoiceNumber customer grandTotal paidAmount balanceAmount dueDate paymentStatus invoiceDate')
    .sort({ dueDate: 1 })
    .lean();

  const buckets = {
    current: { count: 0, amount: 0 },
    days1to30: { count: 0, amount: 0 },
    days31to60: { count: 0, amount: 0 },
    days61plus: { count: 0, amount: 0 },
  };

  const rows = invoices.map((inv) => {
    const due = inv.dueDate ? new Date(inv.dueDate) : null;
    let bucket = 'current';
    let daysPastDue = 0;
    if (due && due < now) {
      daysPastDue = Math.floor((now - due) / (24 * 60 * 60 * 1000));
      if (daysPastDue <= 30) bucket = 'days1to30';
      else if (daysPastDue <= 60) bucket = 'days31to60';
      else bucket = 'days61plus';
    }
    buckets[bucket].count += 1;
    buckets[bucket].amount += inv.balanceAmount;
    return { ...inv, daysPastDue, agingBucket: bucket };
  });

  return {
    summary: buckets,
    totalOutstanding: rows.reduce((s, r) => s + r.balanceAmount, 0),
    invoices: rows.slice(0, 100),
  };
}

async function inventoryReport() {
  const products = await Product.find({ status: 'ACTIVE' })
    .populate('category', 'name code')
    .select('sku name currentStock minimumStock sellingPrice purchasePrice category unit')
    .sort({ currentStock: 1 })
    .lean();

  const lowStock = products.filter((p) => p.minimumStock > 0 && p.currentStock <= p.minimumStock);
  const outOfStock = products.filter((p) => p.currentStock <= 0);
  const stockValue = products.reduce((s, p) => s + p.currentStock * (p.purchasePrice || 0), 0);

  return {
    totals: {
      activeProducts: products.length,
      lowStock: lowStock.length,
      outOfStock: outOfStock.length,
      inventoryValueAtCost: Math.round(stockValue * 100) / 100,
    },
    lowStock,
    outOfStock,
  };
}

async function paymentsSummary(query = {}) {
  const days = parseDays(query, 30);
  const since = sinceDays(days);

  const [byMethod, daily, totals] = await Promise.all([
    Payment.aggregate([
      { $match: { paymentDate: { $gte: since } } },
      { $group: { _id: '$method', amount: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { amount: -1 } },
    ]),
    Payment.aggregate([
      { $match: { paymentDate: { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$paymentDate' } },
          amount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Payment.aggregate([
      { $match: { paymentDate: { $gte: since } } },
      { $group: { _id: null, amount: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
  ]);

  return {
    days,
    totals: { amount: totals[0]?.amount || 0, count: totals[0]?.count || 0 },
    byMethod: byMethod.map((r) => ({ method: r._id, amount: r.amount, count: r.count })),
    daily: daily.map((r) => ({ date: r._id, amount: r.amount, count: r.count })),
  };
}

module.exports = {
  salesSummary,
  receivablesReport,
  inventoryReport,
  paymentsSummary,
};
