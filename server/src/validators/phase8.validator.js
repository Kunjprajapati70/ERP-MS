const Joi = require('joi');
const { validate } = require('./auth.validator');
const { ATTENDANCE_STATUSES } = require('../models/Attendance');

const objectId = Joi.string().hex().length(24);

const attendanceSchema = Joi.object({
  employee: objectId.required(),
  date: Joi.date().optional(),
  status: Joi.string()
    .valid(...ATTENDANCE_STATUSES)
    .optional(),
  checkIn: Joi.date().allow(null).optional(),
  checkOut: Joi.date().allow(null).optional(),
  workHours: Joi.number().min(0).optional(),
  notes: Joi.string().allow('').max(500).optional(),
});

const checkOutSchema = Joi.object({
  checkOut: Joi.date().optional(),
  notes: Joi.string().allow('').max(500).optional(),
});

const payrollCreateSchema = Joi.object({
  periodYear: Joi.number().integer().min(2000).max(2100).required(),
  periodMonth: Joi.number().integer().min(1).max(12).required(),
  notes: Joi.string().allow('').max(1000).optional(),
});

const payrollStatusSchema = Joi.object({
  status: Joi.string().valid('APPROVED', 'PAID', 'CANCELLED').required(),
});

const qcCreateSchema = Joi.object({
  workOrder: objectId.required(),
  inspectedQty: Joi.number().integer().min(1).optional(),
  defectNotes: Joi.string().allow('').max(2000).optional(),
});

const qcCompleteSchema = Joi.object({
  passedQty: Joi.number().integer().min(0).required(),
  failedQty: Joi.number().integer().min(0).required(),
  defectNotes: Joi.string().allow('').max(2000).optional(),
});

module.exports = {
  validate,
  attendanceSchema,
  checkOutSchema,
  payrollCreateSchema,
  payrollStatusSchema,
  qcCreateSchema,
  qcCompleteSchema,
};
