const employeeService = require('../services/employeeService');
const asyncHandler = require('../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const data = await employeeService.listEmployees(req.query);
  res.json({ success: true, message: 'Employees retrieved', data });
});

const getById = asyncHandler(async (req, res) => {
  const employee = await employeeService.getEmployee(req.params.id);
  res.json({ success: true, message: 'Employee retrieved', data: { employee } });
});

const create = asyncHandler(async (req, res) => {
  const employee = await employeeService.createEmployee(req.body, req.user, req);
  res.status(201).json({ success: true, message: 'Employee created', data: { employee } });
});

const update = asyncHandler(async (req, res) => {
  const employee = await employeeService.updateEmployee(req.params.id, req.body, req.user, req);
  res.json({ success: true, message: 'Employee updated', data: { employee } });
});

const remove = asyncHandler(async (req, res) => {
  const data = await employeeService.deleteEmployee(req.params.id, req.user, req);
  res.json({ success: true, message: 'Employee deleted', data });
});

module.exports = { list, getById, create, update, remove };
