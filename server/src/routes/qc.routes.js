const express = require('express');
const qcController = require('../controllers/qc.controller');
const authenticateUser = require('../middleware/authenticate');
const { authorizePermissions } = require('../middleware/authorize');
const { validate, qcCreateSchema, qcCompleteSchema } = require('../validators/phase8.validator');

const router = express.Router();
router.use(authenticateUser);

router.get('/', authorizePermissions('qc:read'), qcController.list);
router.get('/:id', authorizePermissions('qc:read'), qcController.getById);
router.post('/', authorizePermissions('qc:write'), validate(qcCreateSchema), qcController.create);
router.post(
  '/:id/complete',
  authorizePermissions('qc:write'),
  validate(qcCompleteSchema),
  qcController.complete
);

module.exports = router;
