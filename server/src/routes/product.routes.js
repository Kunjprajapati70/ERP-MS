const express = require('express');
const productController = require('../controllers/product.controller');
const authenticateUser = require('../middleware/authenticate');
const { authorizePermissions } = require('../middleware/authorize');
const {
  validate,
  productSchema,
  productUpdateSchema,
  adjustStockSchema,
} = require('../validators/product.validator');

const router = express.Router();
router.use(authenticateUser);

router.get('/inventory/summary', authorizePermissions('inventory:read'), productController.summary);
router.get('/inventory/ledger', authorizePermissions('inventory:read'), productController.ledger);

router.get('/', authorizePermissions('products:read'), productController.list);
router.get('/:id', authorizePermissions('products:read'), productController.getById);
router.post('/', authorizePermissions('products:write'), validate(productSchema), productController.create);
router.patch('/:id', authorizePermissions('products:write'), validate(productUpdateSchema), productController.update);
router.delete('/:id', authorizePermissions('products:write'), productController.remove);
router.post(
  '/:id/adjust-stock',
  authorizePermissions('inventory:write'),
  validate(adjustStockSchema),
  productController.adjust
);

module.exports = router;
