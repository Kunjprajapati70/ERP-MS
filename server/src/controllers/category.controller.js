const categoryService = require('../services/categoryService');
const asyncHandler = require('../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const data = await categoryService.listCategories(req.query);
  res.json({ success: true, message: 'Categories retrieved', data });
});

const create = asyncHandler(async (req, res) => {
  const category = await categoryService.createCategory(req.body, req.user, req);
  res.status(201).json({ success: true, message: 'Category created', data: { category } });
});

const update = asyncHandler(async (req, res) => {
  const category = await categoryService.updateCategory(req.params.id, req.body, req.user, req);
  res.json({ success: true, message: 'Category updated', data: { category } });
});

const remove = asyncHandler(async (req, res) => {
  const data = await categoryService.deleteCategory(req.params.id, req.user, req);
  res.json({ success: true, message: 'Category deleted', data });
});

module.exports = { list, create, update, remove };
