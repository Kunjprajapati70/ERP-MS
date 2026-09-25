const payrollService = require('../services/payrollService');
const asyncHandler = require('../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const data = await payrollService.listPayrollRuns(req.query);
  res.json({ success: true, message: 'Payroll runs retrieved', data });
});

const getById = asyncHandler(async (req, res) => {
  const payroll = await payrollService.getPayrollRun(req.params.id);
  res.json({ success: true, message: 'Payroll run retrieved', data: { payroll } });
});

const create = asyncHandler(async (req, res) => {
  const payroll = await payrollService.createPayrollRun(req.body, req.user, req);
  res.status(201).json({ success: true, message: 'Payroll run created', data: { payroll } });
});

const transition = asyncHandler(async (req, res) => {
  const payroll = await payrollService.transitionPayroll(
    req.params.id,
    req.body.status,
    req.user,
    req
  );
  res.json({
    success: true,
    message: `Payroll ${req.body.status.toLowerCase()}`,
    data: { payroll },
  });
});

module.exports = { list, getById, create, transition };
