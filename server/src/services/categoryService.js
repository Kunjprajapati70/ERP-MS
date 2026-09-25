const Category = require('../models/Category');
const AppError = require('../utils/AppError');
const { parseListQuery, buildPagedResult } = require('../utils/pagination');
const { writeAuditLog } = require('./auditService');

async function listCategories(query) {
  const { page, limit, skip, search, sort } = parseListQuery(query, { defaultSort: 'name' });
  const filter = {};
  if (query.isActive !== undefined) {
    filter.isActive = query.isActive === 'true' || query.isActive === true;
  }
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { code: { $regex: search, $options: 'i' } },
    ];
  }

  const [items, total] = await Promise.all([
    Category.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    Category.countDocuments(filter),
  ]);

  return buildPagedResult({ items, total, page, limit });
}

async function createCategory(payload, actor, req) {
  const existing = await Category.findOne({
    $or: [{ name: payload.name }, ...(payload.code ? [{ code: payload.code.toUpperCase() }] : [])],
  });
  if (existing) {
    throw AppError.conflict('Category name or code already exists', 'CATEGORY_EXISTS');
  }

  const category = await Category.create({
    name: payload.name,
    code: payload.code ? payload.code.toUpperCase() : undefined,
    description: payload.description || '',
    parent: payload.parent || null,
    isActive: payload.isActive !== false,
  });

  await writeAuditLog({
    userId: actor._id,
    action: 'CATEGORY_CREATED',
    module: 'PRODUCTS',
    recordId: category._id.toString(),
    metadata: { name: category.name },
    req,
  });

  return category;
}

async function updateCategory(id, payload, actor, req) {
  const category = await Category.findById(id);
  if (!category) throw AppError.notFound('Category not found', 'CATEGORY_NOT_FOUND');

  if (payload.name !== undefined) category.name = payload.name;
  if (payload.code !== undefined) category.code = payload.code ? payload.code.toUpperCase() : '';
  if (payload.description !== undefined) category.description = payload.description;
  if (payload.parent !== undefined) category.parent = payload.parent || null;
  if (payload.isActive !== undefined) category.isActive = payload.isActive;

  await category.save();

  await writeAuditLog({
    userId: actor._id,
    action: 'CATEGORY_UPDATED',
    module: 'PRODUCTS',
    recordId: category._id.toString(),
    metadata: { name: category.name },
    req,
  });

  return category;
}

async function deleteCategory(id, actor, req) {
  const category = await Category.findById(id);
  if (!category) throw AppError.notFound('Category not found', 'CATEGORY_NOT_FOUND');

  const Product = require('../models/Product');
  const inUse = await Product.countDocuments({ category: id });
  if (inUse > 0) {
    throw AppError.badRequest('Category is used by products and cannot be deleted', 'CATEGORY_IN_USE');
  }

  await category.deleteOne();
  await writeAuditLog({
    userId: actor._id,
    action: 'CATEGORY_DELETED',
    module: 'PRODUCTS',
    recordId: id,
    metadata: { name: category.name },
    req,
  });

  return { id };
}

module.exports = {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};
