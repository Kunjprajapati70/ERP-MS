const express = require('express');
const bomController = require('../controllers/bom.controller');
const authenticateUser = require('../middleware/authenticate');
const { authorizePermissions } = require('../middleware/authorize');
const { validate, bomSchema, bomUpdateSchema } = require('../validators/manufacturing.validator');

const router = express.Router();
router.use(authenticateUser);

router.get('/', authorizePermissions('manufacturing:read'), bomController.list);
router.get('/:id', authorizePermissions('manufacturing:read'), bomController.getById);
router.post('/', authorizePermissions('manufacturing:write'), validate(bomSchema), bomController.create);
router.patch(
  '/:id',
  authorizePermissions('manufacturing:write'),
  validate(bomUpdateSchema),
  bomController.update
);
router.delete('/:id', authorizePermissions('manufacturing:write'), bomController.remove);

module.exports = router;
