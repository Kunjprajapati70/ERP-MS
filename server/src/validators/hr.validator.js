const Joi = require('joi');
const { validate } = require('./auth.validator');
const { DEPARTMENTS, EMPLOYMENT_TYPES, EMPLOYEE_STATUSES } = require('../models/Employee');
const { LEAVE_TYPES } = require('../models/LeaveRequest');

const objectId = Joi.string().hex().length(24);

const employeeSchema = Joi.object({
  employeeCode: Joi.string().trim().uppercase().max(40).optional(),
  firstName: Joi.string().trim().min(1).max(80).required(),
  lastName: Joi.string().trim().min(1).max(80).required(),
  email: Joi.string().email({ tlds: { allow: false } }).allow('').optional(),
  phone: Joi.string().allow('').max(40).optional(),
  department: Joi.string()
    .valid(...DEPARTMENTS)
    .optional(),
  designation: Joi.string().allow('').max(120).optional(),
  employmentType: Joi.string()
    .valid(...EMPLOYMENT_TYPES)
    .optional(),
  joinDate: Joi.date().optional(),
  salary: Joi.number().min(0).optional(),
  status: Joi.string()
    .valid(...EMPLOYEE_STATUSES)
    .optional(),
  user: objectId.allow(null, '').optional(),
  manager: objectId.allow(null, '').optional(),
  notes: Joi.string().allow('').max(2000).optional(),
});

const employeeUpdateSchema = employeeSchema.fork(['firstName', 'lastName'], (s) => s.optional()).min(1);

const leaveSchema = Joi.object({
  employee: objectId.required(),
  leaveType: Joi.string()
    .valid(...LEAVE_TYPES)
    .optional(),
  startDate: Joi.date().required(),
  endDate: Joi.date().required(),
  reason: Joi.string().allow('').max(1000).optional(),
});

const leaveReviewSchema = Joi.object({
  decision: Joi.string().valid('APPROVED', 'REJECTED').required(),
  reviewNotes: Joi.string().allow('').max(500).optional(),
});

module.exports = {
  validate,
  employeeSchema,
  employeeUpdateSchema,
  leaveSchema,
  leaveReviewSchema,
};
