const Employee = require('../models/Employee');
const AppError = require('../utils/AppError');
const { parseListQuery, buildPagedResult } = require('../utils/pagination');
const { writeAuditLog } = require('./auditService');
const { nextDocumentNumber } = require('../utils/documentHelpers');

async function populateEmployee(id) {
  return Employee.findById(id)
    .populate('user', 'firstName lastName email')
    .populate('manager', 'employeeCode firstName lastName')
    .populate('createdBy', 'firstName lastName');
}

async function listEmployees(query) {
  const { page, limit, skip, search, sort, status } = parseListQuery(query);
  const filter = {};
  if (status) filter.status = status.toUpperCase();
  if (query.department) filter.department = query.department.toUpperCase();
  if (search) {
    filter.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { employeeCode: { $regex: search, $options: 'i' } },
      { designation: { $regex: search, $options: 'i' } },
    ];
  }

  const [items, total] = await Promise.all([
    Employee.find(filter).populate('manager', 'firstName lastName employeeCode').sort(sort).skip(skip).limit(limit),
    Employee.countDocuments(filter),
  ]);
  return buildPagedResult({ items, total, page, limit });
}

async function getEmployee(id) {
  const employee = await populateEmployee(id);
  if (!employee) throw AppError.notFound('Employee not found', 'EMPLOYEE_NOT_FOUND');
  return employee;
}

async function createEmployee(payload, actor, req) {
  const employeeCode = payload.employeeCode
    ? payload.employeeCode.toUpperCase()
    : await nextDocumentNumber(Employee, 'employeeCode', 'EMP');

  const exists = await Employee.findOne({ employeeCode });
  if (exists) throw AppError.conflict('Employee code already exists', 'EMPLOYEE_EXISTS');

  const employee = await Employee.create({
    employeeCode,
    firstName: payload.firstName,
    lastName: payload.lastName,
    email: payload.email || '',
    phone: payload.phone || '',
    department: payload.department || 'OTHER',
    designation: payload.designation || '',
    employmentType: payload.employmentType || 'FULL_TIME',
    joinDate: payload.joinDate || new Date(),
    salary: Number(payload.salary || 0),
    status: payload.status || 'ACTIVE',
    user: payload.user || null,
    manager: payload.manager || null,
    notes: payload.notes || '',
    createdBy: actor._id,
  });

  await writeAuditLog({
    userId: actor._id,
    action: 'EMPLOYEE_CREATED',
    module: 'HR',
    recordId: employee._id.toString(),
    metadata: { employeeCode },
    req,
  });

  return populateEmployee(employee._id);
}

async function updateEmployee(id, payload, actor, req) {
  const employee = await Employee.findById(id);
  if (!employee) throw AppError.notFound('Employee not found', 'EMPLOYEE_NOT_FOUND');

  const fields = [
    'firstName',
    'lastName',
    'email',
    'phone',
    'department',
    'designation',
    'employmentType',
    'joinDate',
    'salary',
    'status',
    'user',
    'manager',
    'notes',
  ];
  fields.forEach((f) => {
    if (payload[f] !== undefined) employee[f] = payload[f];
  });
  if (payload.employeeCode) employee.employeeCode = payload.employeeCode.toUpperCase();

  await employee.save();
  await writeAuditLog({
    userId: actor._id,
    action: 'EMPLOYEE_UPDATED',
    module: 'HR',
    recordId: id,
    metadata: { employeeCode: employee.employeeCode },
    req,
  });
  return populateEmployee(id);
}

async function deleteEmployee(id, actor, req) {
  const employee = await Employee.findById(id);
  if (!employee) throw AppError.notFound('Employee not found', 'EMPLOYEE_NOT_FOUND');
  if (employee.status === 'ACTIVE') {
    throw AppError.badRequest('Deactivate the employee before deleting', 'EMPLOYEE_ACTIVE');
  }
  await employee.deleteOne();
  await writeAuditLog({
    userId: actor._id,
    action: 'EMPLOYEE_DELETED',
    module: 'HR',
    recordId: id,
    metadata: { employeeCode: employee.employeeCode },
    req,
  });
  return { id };
}

module.exports = {
  listEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
};
