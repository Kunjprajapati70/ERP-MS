const attendanceService = require('../services/attendanceService');
const asyncHandler = require('../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const data = await attendanceService.listAttendance(req.query);
  res.json({ success: true, message: 'Attendance retrieved', data });
});

const mark = asyncHandler(async (req, res) => {
  const attendance = await attendanceService.markAttendance(req.body, req.user, req);
  res.status(201).json({ success: true, message: 'Attendance marked', data: { attendance } });
});

const checkOut = asyncHandler(async (req, res) => {
  const attendance = await attendanceService.checkOut(req.params.id, req.body, req.user, req);
  res.json({ success: true, message: 'Checked out', data: { attendance } });
});

const getMyToday = asyncHandler(async (req, res) => {
  const data = await attendanceService.getMyTodayAttendance(req.user);
  res.json({ success: true, message: 'Today attendance retrieved', data });
});

const myCheckIn = asyncHandler(async (req, res) => {
  const data = await attendanceService.myCheckIn(req.user, req.body, req);
  res.status(201).json({ success: true, message: 'Checked in successfully', data });
});

const myCheckOut = asyncHandler(async (req, res) => {
  const data = await attendanceService.myCheckOut(req.user, req.body, req);
  res.json({ success: true, message: 'Checked out successfully', data });
});

const getMyHistory = asyncHandler(async (req, res) => {
  const data = await attendanceService.getMyAttendanceHistory(req.user, req.query);
  res.json({ success: true, message: 'Attendance history retrieved', data });
});

module.exports = {
  list,
  mark,
  checkOut,
  getMyToday,
  myCheckIn,
  myCheckOut,
  getMyHistory,
};
