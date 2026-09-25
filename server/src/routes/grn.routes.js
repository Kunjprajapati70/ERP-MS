const express = require('express');
const grnController = require('../controllers/grn.controller');
const authenticateUser = require('../middleware/authenticate');
const { authorizePermissions } = require('../middleware/authorize');
const { validate, grnSchema } = require('../validators/party.validator');

const router = express.Router();
router.use(authenticateUser);

router.get('/', authorizePermissions('grn:read'), grnController.list);
router.get('/:id', authorizePermissions('grn:read'), grnController.getById);
router.post('/', authorizePermissions('grn:write'), validate(grnSchema), grnController.create);
router.post('/:id/confirm', authorizePermissions('grn:write'), grnController.confirm);
router.post('/:id/cancel', authorizePermissions('grn:write'), grnController.cancel);

module.exports = router;
