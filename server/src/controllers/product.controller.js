const productService = require('../services/productService');
const asyncHandler = require('../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const data = await productService.listProducts(req.query);
  res.json({ success: true, message: 'Products retrieved', data });
});

const getById = asyncHandler(async (req, res) => {
  const product = await productService.getProductById(req.params.id);
  res.json({ success: true, message: 'Product retrieved', data: { product } });
});

const create = asyncHandler(async (req, res) => {
  const product = await productService.createProduct(req.body, req.user, req);
  res.status(201).json({ success: true, message: 'Product created', data: { product } });
});

const update = asyncHandler(async (req, res) => {
  const product = await productService.updateProduct(req.params.id, req.body, req.user, req);
  res.json({ success: true, message: 'Product updated', data: { product } });
});

const remove = asyncHandler(async (req, res) => {
  const data = await productService.deleteProduct(req.params.id, req.user, req);
  res.json({ success: true, message: 'Product deleted', data });
});

const ledger = asyncHandler(async (req, res) => {
  const data = await productService.listStockLedger(req.query);
  res.json({ success: true, message: 'Stock ledger retrieved', data });
});

const summary = asyncHandler(async (req, res) => {
  const data = await productService.getInventorySummary();
  res.json({ success: true, message: 'Inventory summary', data });
});

const adjust = asyncHandler(async (req, res) => {
  const data = await productService.adjustProductStock(req.params.id, req.body, req.user, req);
  res.json({ success: true, message: 'Stock adjusted', data });
});

module.exports = { list, getById, create, update, remove, ledger, summary, adjust };
