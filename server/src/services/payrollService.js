const PayrollRun = require('../models/PayrollRun');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const AppError = require('../utils/AppError');
const { parseListQuery, buildPagedResult } = require('../utils/pagination');
const { writeAuditLog } = require('./auditService');
const { createNotification } = require('./notificationService');
const { nextDocumentNumber } = require('../utils/documentHelpers');
const { dayStart } = require('./attendanceService');

function periodBounds(year, month) {
  const periodStart = new Date(year, month - 1, 1);
  periodStart.setHours(0, 0, 0, 0);
  const periodEnd = new Date(year, month, 0);
  periodEnd.setHours(23, 59, 59, 999);
  return { periodStart, periodEnd };
}

function countWeekdays(start, end) {
  let count = 0;
  const cur = new Date(start);
  cur.setHours(0, 0, 0, 0);
  const last = new Date(end);
  last.setHours(0, 0, 0, 0);
  while (cur <= last) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count += 1;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

async function buildLinesForPeriod(periodStart, periodEnd) {
  const employees = await Employee.find({ status: { $in: ['ACTIVE', 'ON_LEAVE'] } });
  const workingDaysInPeriod = countWeekdays(periodStart, periodEnd) || 1;
  const endExclusive = new Date(periodEnd);
  endExclusive.setDate(endExclusive.getDate() + 1);
  endExclusive.setHours(0, 0, 0, 0);

  const lines = [];
  for (const emp of employees) {
    const records = await Attendance.find({
      employee: emp._id,
      date: { $gte: periodStart, $lt: endExclusive },
    });

    let presentDays = 0;
    let absentDays = 0;
    let halfDays = 0;
    let leaveDays = 0;
    for (const r of records) {
      if (r.status === 'PRESENT' || r.status === 'LATE') presentDays += 1;
      else if (r.status === 'ABSENT') absentDays += 1;
      else if (r.status === 'HALF_DAY') halfDays += 1;
      else if (r.status === 'ON_LEAVE') leaveDays += 1;
    }

    const paidUnits = presentDays + halfDays * 0.5 + leaveDays;
    const baseSalary = Number(emp.salary || 0);
    const daily = baseSalary / workingDaysInPeriod;
    const earnings = Math.round(daily * paidUnits * 100) / 100;
    const deductions = Math.round(daily * absentDays * 100) / 100;
    const netPay = Math.max(0, Math.round((earnings - deductions) * 100) / 100);

    lines.push({
      employee: emp._id,
      baseSalary,
      presentDays,
      absentDays,
      halfDays,
      leaveDays,
      workingDaysInPeriod,
      earnings,
      deductions,
      netPay,
      notes: '',
    });
  }
  return lines;
}

function summarize(lines) {
  return lines.reduce(
    (acc, line) => {
      acc.totalEarnings += line.earnings;
      acc.totalDeductions += line.deductions;
      acc.totalNet += line.netPay;
      return acc;
    },
    { totalEarnings: 0, totalDeductions: 0, totalNet: 0 }
  );
}

async function populatePayroll(id) {
  return PayrollRun.findById(id)
    .populate('lines.employee', 'employeeCode firstName lastName department salary')
    .populate('createdBy', 'firstName lastName')
    .populate('approvedBy', 'firstName lastName');
}

async function listPayrollRuns(query) {
  const { page, limit, skip, sort, status } = parseListQuery(query);
  const filter = {};
  if (status) filter.status = status.toUpperCase();
  if (query.year) filter.periodYear = Number(query.year);
  if (query.month) filter.periodMonth = Number(query.month);

  const [items, total] = await Promise.all([
    PayrollRun.find(filter).sort(sort || { periodYear: -1, periodMonth: -1 }).skip(skip).limit(limit),
    PayrollRun.countDocuments(filter),
  ]);
  return buildPagedResult({ items, total, page, limit });
}

async function getPayrollRun(id) {
  const run = await populatePayroll(id);
  if (!run) throw AppError.notFound('Payroll run not found', 'PAYROLL_NOT_FOUND');
  return run;
}

async function createPayrollRun(payload, actor, req) {
  const year = Number(payload.periodYear);
  const month = Number(payload.periodMonth);
  if (!year || !month || month < 1 || month > 12) {
    throw AppError.badRequest('Valid periodYear and periodMonth are required', 'INVALID_PERIOD');
  }

  const existing = await PayrollRun.findOne({ periodYear: year, periodMonth: month });
  if (existing) {
    throw AppError.conflict('Payroll already exists for this period', 'PAYROLL_EXISTS');
  }

  const { periodStart, periodEnd } = periodBounds(year, month);
  const lines = await buildLinesForPeriod(periodStart, periodEnd);
  if (!lines.length) {
    throw AppError.badRequest('No active employees to include in payroll', 'NO_EMPLOYEES');
  }

  const totals = summarize(lines);
  const runNumber = await nextDocumentNumber(PayrollRun, 'runNumber', 'PAYR');

  const run = await PayrollRun.create({
    runNumber,
    periodYear: year,
    periodMonth: month,
    periodStart,
    periodEnd,
    status: 'DRAFT',
    lines,
    ...totals,
    notes: payload.notes || '',
    createdBy: actor._id,
  });

  await writeAuditLog({
    userId: actor._id,
    action: 'PAYROLL_CREATED',
    module: 'HR',
    recordId: run._id.toString(),
    metadata: { runNumber, year, month, totalNet: totals.totalNet },
    req,
  });

  return populatePayroll(run._id);
}

async function transitionPayroll(id, nextStatus, actor, req) {
  const run = await PayrollRun.findById(id);
  if (!run) throw AppError.notFound('Payroll run not found', 'PAYROLL_NOT_FOUND');

  const allowed = {
    APPROVED: ['DRAFT'],
    PAID: ['APPROVED'],
    CANCELLED: ['DRAFT'],
  };

  if (!allowed[nextStatus]?.includes(run.status)) {
    throw AppError.badRequest(
      `Cannot move payroll from ${run.status} to ${nextStatus}`,
      'INVALID_PAYROLL_TRANSITION'
    );
  }

  run.status = nextStatus;
  if (nextStatus === 'APPROVED') {
    run.approvedBy = actor._id;
    run.approvedAt = new Date();
  }
  if (nextStatus === 'PAID') {
    run.paidAt = new Date();
  }
  await run.save();

  await writeAuditLog({
    userId: actor._id,
    action: `PAYROLL_${nextStatus}`,
    module: 'HR',
    recordId: id,
    metadata: { runNumber: run.runNumber },
    req,
  });

  createNotification({
    userId: actor._id,
    title: `Payroll ${nextStatus.toLowerCase()}`,
    message: `${run.runNumber} (${run.periodMonth}/${run.periodYear}) is now ${nextStatus}.`,
    type: 'SUCCESS',
    module: 'HR',
    link: '/hr/payroll',
  });

  return populatePayroll(id);
}

module.exports = {
  listPayrollRuns,
  getPayrollRun,
  createPayrollRun,
  transitionPayroll,
  periodBounds,
};
