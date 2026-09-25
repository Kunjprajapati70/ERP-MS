const LeaveRequest = require('../models/LeaveRequest');
const Employee = require('../models/Employee');
const AppError = require('../utils/AppError');
const { parseListQuery, buildPagedResult } = require('../utils/pagination');
const { writeAuditLog } = require('./auditService');
const { createNotification } = require('./notificationService');
const { nextDocumentNumber } = require('../utils/documentHelpers');

function calcLeaveDays(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  if (end < start) {
    throw AppError.badRequest('End date must be on or after start date', 'INVALID_LEAVE_DATES');
  }
  const ms = end - start;
  return Math.floor(ms / (24 * 60 * 60 * 1000)) + 1;
}

async function populateLeave(id) {
  return LeaveRequest.findById(id)
    .populate('employee', 'employeeCode firstName lastName department')
    .populate('reviewedBy', 'firstName lastName')
    .populate('createdBy', 'firstName lastName');
}

async function listLeaveRequests(query) {
  const { page, limit, skip, search, sort, status } = parseListQuery(query);
  const filter = {};
  if (status) filter.status = status.toUpperCase();
  if (query.employee) filter.employee = query.employee;
  if (search) filter.requestNumber = { $regex: search, $options: 'i' };

  const [items, total] = await Promise.all([
    LeaveRequest.find(filter)
      .populate('employee', 'employeeCode firstName lastName department')
      .sort(sort)
      .skip(skip)
      .limit(limit),
    LeaveRequest.countDocuments(filter),
  ]);
  return buildPagedResult({ items, total, page, limit });
}

async function getLeaveRequest(id) {
  const leave = await populateLeave(id);
  if (!leave) throw AppError.notFound('Leave request not found', 'LEAVE_NOT_FOUND');
  return leave;
}

async function createLeaveRequest(payload, actor, req) {
  const employee = await Employee.findById(payload.employee);
  if (!employee || employee.status === 'TERMINATED') {
    throw AppError.badRequest('Valid employee is required', 'INVALID_EMPLOYEE');
  }

  const days = calcLeaveDays(payload.startDate, payload.endDate);
  const requestNumber = await nextDocumentNumber(LeaveRequest, 'requestNumber', 'LV');

  const leave = await LeaveRequest.create({
    requestNumber,
    employee: employee._id,
    leaveType: payload.leaveType || 'CASUAL',
    startDate: payload.startDate,
    endDate: payload.endDate,
    days,
    reason: payload.reason || '',
    status: 'PENDING',
    createdBy: actor._id,
  });

  await writeAuditLog({
    userId: actor._id,
    action: 'LEAVE_CREATED',
    module: 'HR',
    recordId: leave._id.toString(),
    metadata: { requestNumber, days },
    req,
  });

  return populateLeave(leave._id);
}

async function reviewLeaveRequest(id, decision, payload, actor, req) {
  const leave = await LeaveRequest.findById(id);
  if (!leave) throw AppError.notFound('Leave request not found', 'LEAVE_NOT_FOUND');
  if (leave.status !== 'PENDING') {
    throw AppError.badRequest('Only pending leave can be reviewed', 'LEAVE_NOT_PENDING');
  }

  const next = decision.toUpperCase();
  if (!['APPROVED', 'REJECTED'].includes(next)) {
    throw AppError.badRequest('Decision must be APPROVED or REJECTED', 'INVALID_LEAVE_DECISION');
  }

  leave.status = next;
  leave.reviewedBy = actor._id;
  leave.reviewedAt = new Date();
  leave.reviewNotes = payload.reviewNotes || '';
  await leave.save();

  if (next === 'APPROVED') {
    await Employee.findByIdAndUpdate(leave.employee, { status: 'ON_LEAVE' });
  }

  await writeAuditLog({
    userId: actor._id,
    action: `LEAVE_${next}`,
    module: 'HR',
    recordId: id,
    metadata: { requestNumber: leave.requestNumber },
    req,
  });

  createNotification({
    userId: actor._id,
    title: `Leave ${next.toLowerCase()}`,
    message: `${leave.requestNumber} was ${next.toLowerCase()}.`,
    type: next === 'APPROVED' ? 'SUCCESS' : 'WARNING',
    module: 'HR',
    link: '/hr/leave',
  });

  return populateLeave(id);
}

async function cancelLeaveRequest(id, actor, req) {
  const leave = await LeaveRequest.findById(id);
  if (!leave) throw AppError.notFound('Leave request not found', 'LEAVE_NOT_FOUND');
  if (!['PENDING', 'APPROVED'].includes(leave.status)) {
    throw AppError.badRequest('Leave cannot be cancelled in current status', 'LEAVE_NOT_CANCELLABLE');
  }

  const wasApproved = leave.status === 'APPROVED';
  leave.status = 'CANCELLED';
  await leave.save();

  if (wasApproved) {
    await Employee.findByIdAndUpdate(leave.employee, { status: 'ACTIVE' });
  }

  await writeAuditLog({
    userId: actor._id,
    action: 'LEAVE_CANCELLED',
    module: 'HR',
    recordId: id,
    metadata: { requestNumber: leave.requestNumber },
    req,
  });

  return populateLeave(id);
}

module.exports = {
  listLeaveRequests,
  getLeaveRequest,
  createLeaveRequest,
  reviewLeaveRequest,
  cancelLeaveRequest,
};
