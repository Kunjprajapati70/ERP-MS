const express = require('express');
const attendanceController = require('../controllers/attendance.controller');
const authenticateUser = require('../middleware/authenticate');
const { authorizePermissions, requireEmployeeAttendance } = require('../middleware/authorize');
const { validate, attendanceSchema, checkOutSchema } = require('../validators/phase8.validator');

const router = express.Router();
router.use(authenticateUser);

// Self-service punch — employees only (admins/customers are rejected here, not only in the UI)
router.get('/my-today', requireEmployeeAttendance, attendanceController.getMyToday);
router.post('/my-check-in', requireEmployeeAttendance, attendanceController.myCheckIn);
router.post('/my-check-out', requireEmployeeAttendance, attendanceController.myCheckOut);
router.get('/my-history', requireEmployeeAttendance, attendanceController.getMyHistory);

// Admin & HR management endpoints (requires attendance permissions)
router.get('/', authorizePermissions('attendance:read'), attendanceController.list);
router.post('/', authorizePermissions('attendance:write'), validate(attendanceSchema), attendanceController.mark);
router.post(
  '/:id/checkout',
  authorizePermissions('attendance:write'),
  validate(checkOutSchema),
  attendanceController.checkOut
);

module.exports = router;
