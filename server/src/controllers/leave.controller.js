const leaveService = require('../services/leaveService');
const asyncHandler = require('../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const data = await leaveService.listLeaveRequests(req.query);
  res.json({ success: true, message: 'Leave requests retrieved', data });
});

const getById = asyncHandler(async (req, res) => {
  const leave = await leaveService.getLeaveRequest(req.params.id);
  res.json({ success: true, message: 'Leave request retrieved', data: { leave } });
});

const create = asyncHandler(async (req, res) => {
  const leave = await leaveService.createLeaveRequest(req.body, req.user, req);
  res.status(201).json({ success: true, message: 'Leave request created', data: { leave } });
});

const review = asyncHandler(async (req, res) => {
  const leave = await leaveService.reviewLeaveRequest(
    req.params.id,
    req.body.decision,
    req.body,
    req.user,
    req
  );
  res.json({
    success: true,
    message: `Leave ${req.body.decision.toLowerCase()}`,
    data: { leave },
  });
});

const cancel = asyncHandler(async (req, res) => {
  const leave = await leaveService.cancelLeaveRequest(req.params.id, req.user, req);
  res.json({ success: true, message: 'Leave cancelled', data: { leave } });
});

module.exports = { list, getById, create, review, cancel };
