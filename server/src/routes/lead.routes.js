const express = require('express');
const leadController = require('../controllers/lead.controller');
const authenticateUser = require('../middleware/authenticate');
const { authorizePermissions } = require('../middleware/authorize');
const {
  validate,
  leadSchema,
  leadUpdateSchema,
  convertLeadSchema,
} = require('../validators/crm.validator');

const router = express.Router();
router.use(authenticateUser);

router.get('/', authorizePermissions('crm:read'), leadController.list);
router.get('/:id', authorizePermissions('crm:read'), leadController.getById);
router.post('/', authorizePermissions('crm:write'), validate(leadSchema), leadController.create);
router.patch('/:id', authorizePermissions('crm:write'), validate(leadUpdateSchema), leadController.update);
router.post(
  '/:id/convert',
  authorizePermissions('crm:write'),
  validate(convertLeadSchema),
  leadController.convert
);
router.delete('/:id', authorizePermissions('crm:write'), leadController.remove);

module.exports = router;
