const express = require('express');
const leaveController = require('../controllers/leave.controller');
const authenticateUser = require('../middleware/authenticate');
const { authorizePermissions } = require('../middleware/authorize');
const { validate, leaveSchema, leaveReviewSchema } = require('../validators/hr.validator');

const router = express.Router();
router.use(authenticateUser);

router.get('/', authorizePermissions('leave:read'), leaveController.list);
router.get('/:id', authorizePermissions('leave:read'), leaveController.getById);
router.post('/', authorizePermissions('leave:write'), validate(leaveSchema), leaveController.create);
router.post(
  '/:id/review',
  authorizePermissions('leave:write'),
  validate(leaveReviewSchema),
  leaveController.review
);
router.post('/:id/cancel', authorizePermissions('leave:write'), leaveController.cancel);

module.exports = router;
