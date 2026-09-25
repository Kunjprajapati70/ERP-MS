const SalesOrder = require('../models/SalesOrder');
const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const Product = require('../models/Product');
const PurchaseOrder = require('../models/PurchaseOrder');
const Customer = require('../models/Customer');
const GRN = require('../models/GRN');
const Lead = require('../models/Lead');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const { formatDuration, dayStart } = require('./attendanceService');

function startOfDaysAgo(days) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (days - 1));
  return d;
}

async function getDashboardOverview() {
  const since30 = startOfDaysAgo(30);
  const confirmedStatuses = ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];

  const [
    salesOrdersOpen,
    salesRevenue30,
    unpaidInvoices,
    overdueInvoices,
    payments30,
    lowStockCount,
    activeCustomers,
    purchaseOpen,
    recentSales,
    recentPayments,
    leadsOpen,
    grnDraft,
  ] = await Promise.all([
    SalesOrder.countDocuments({ status: { $in: ['DRAFT', 'PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED'] } }),
    SalesOrder.aggregate([
      {
        $match: {
          status: { $in: confirmedStatuses },
          orderDate: { $gte: since30 },
        },
      },
      { $group: { _id: null, total: { $sum: '$grandTotal' }, count: { $sum: 1 } } },
    ]),
    Invoice.countDocuments({ paymentStatus: { $in: ['UNPAID', 'PARTIALLY_PAID'] }, status: { $ne: 'CANCELLED' } }),
    Invoice.countDocuments({
      paymentStatus: { $in: ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'] },
      status: { $ne: 'CANCELLED' },
      dueDate: { $lt: new Date() },
      balanceAmount: { $gt: 0 },
    }),
    Payment.aggregate([
      { $match: { paymentDate: { $gte: since30 } } },
      { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
    Product.countDocuments({
      status: 'ACTIVE',
      $expr: {
        $and: [{ $gt: ['$minimumStock', 0] }, { $lte: ['$currentStock', '$minimumStock'] }],
      },
    }),
    Customer.countDocuments({ status: 'ACTIVE' }),
    PurchaseOrder.countDocuments({
      status: { $in: ['DRAFT', 'PENDING', 'APPROVED', 'ORDERED', 'PARTIALLY_RECEIVED'] },
    }),
    SalesOrder.find({ status: { $in: confirmedStatuses } })
      .sort({ confirmedAt: -1, orderDate: -1 })
      .limit(5)
      .populate('customer', 'name code')
      .select('orderNumber status grandTotal orderDate customer')
      .lean(),
    Payment.find()
      .sort({ paymentDate: -1 })
      .limit(5)
      .populate('customer', 'name code')
      .populate('invoice', 'invoiceNumber')
      .select('paymentNumber amount method paymentDate customer invoice')
      .lean(),
    Lead.countDocuments({ status: { $nin: ['WON', 'LOST'] } }),
    GRN.countDocuments({ status: 'DRAFT' }),
  ]);

  const employeeAttendance = await getEmployeeAttendanceOverview();

  const receivables = await Invoice.aggregate([
    {
      $match: {
        status: { $ne: 'CANCELLED' },
        paymentStatus: { $in: ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'] },
      },
    },
    { $group: { _id: null, total: { $sum: '$balanceAmount' } } },
  ]);

  return {
    kpis: {
      openSalesOrders: salesOrdersOpen,
      salesRevenue30: salesRevenue30[0]?.total || 0,
      salesOrders30: salesRevenue30[0]?.count || 0,
      openInvoices: unpaidInvoices,
      overdueInvoices,
      receivablesTotal: receivables[0]?.total || 0,
      paymentsCollected30: payments30[0]?.total || 0,
      paymentsCount30: payments30[0]?.count || 0,
      lowStockProducts: lowStockCount,
      activeCustomers,
      openPurchaseOrders: purchaseOpen,
      openLeads: leadsOpen,
      draftGrns: grnDraft,
    },
    employeeAttendance,
    recentSalesOrders: recentSales,
    recentPayments,
  };
}

async function getEmployeeAttendanceOverview() {
  const today = dayStart(new Date());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const employeeFilter = { status: { $in: ['ACTIVE', 'ON_LEAVE'] }, department: { $ne: 'ADMIN' } };

  const [totalEmployees, records, recent] = await Promise.all([
    Employee.countDocuments(employeeFilter),
    Attendance.find({
      date: { $gte: today, $lt: tomorrow },
    })
      .populate('employee', 'department status firstName lastName employeeCode')
      .lean(),
    Attendance.find({})
      .populate('employee', 'firstName lastName employeeCode department')
      .sort({ updatedAt: -1 })
      .limit(8)
      .lean(),
  ]);

  const eligibleRecords = records.filter((r) => r.employee && r.employee.department !== 'ADMIN');
  const presentCount = eligibleRecords.filter((r) =>
    ['PRESENT', 'LATE', 'HALF_DAY'].includes(r.status)
  ).length;
  const checkedInCount = eligibleRecords.filter((r) => r.checkIn && !r.checkOut).length;
  const checkedOutCount = eligibleRecords.filter((r) => r.checkIn && r.checkOut).length;
  const absentCount = Math.max(0, totalEmployees - presentCount);
  const attendancePercentage =
    totalEmployees > 0 ? Math.round((presentCount / totalEmployees) * 100) : 0;

  const recentActivity = recent
    .filter((r) => r.employee && r.employee.department !== 'ADMIN')
    .slice(0, 6)
    .map((r) => ({
      id: r._id,
      employeeName: `${r.employee.firstName} ${r.employee.lastName}`.trim(),
      employeeCode: r.employee.employeeCode,
      status: r.status,
      checkIn: r.checkIn,
      checkOut: r.checkOut,
      workHours: r.workHours || 0,
      formattedWorkHours: formatDuration(r.workHours || 0),
      date: r.date,
    }));

  return {
    totalEmployees,
    presentToday: presentCount,
    checkedIn: checkedInCount,
    checkedOut: checkedOutCount,
    absent: absentCount,
    attendancePercentage,
    breakdown: [
      { label: 'Present', count: presentCount },
      { label: 'Checked in', count: checkedInCount },
      { label: 'Checked out', count: checkedOutCount },
      { label: 'Absent', count: absentCount },
    ],
    recentActivity,
  };
}

async function getSalesTrend(days = 14) {
  const since = startOfDaysAgo(days);
  const rows = await SalesOrder.aggregate([
    {
      $match: {
        status: { $in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] },
        orderDate: { $gte: since },
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
  ]);

  const map = new Map(rows.map((r) => [r._id, r]));
  const series = [];
  for (let i = 0; i < days; i += 1) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    const hit = map.get(key);
    series.push({
      date: key,
      revenue: hit?.revenue || 0,
      orders: hit?.orders || 0,
    });
  }
  return series;
}

module.exports = {
  getDashboardOverview,
  getSalesTrend,
};
