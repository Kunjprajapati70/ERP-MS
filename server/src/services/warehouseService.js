const Warehouse = require('../models/Warehouse');
const AppError = require('../utils/AppError');
const { parseListQuery, buildPagedResult } = require('../utils/pagination');
const { writeAuditLog } = require('./auditService');

async function listWarehouses(query) {
  const { page, limit, skip, search, sort } = parseListQuery(query, { defaultSort: 'name' });
  const filter = {};
  if (query.isActive !== undefined) {
    filter.isActive = query.isActive === 'true' || query.isActive === true;
  }
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { code: { $regex: search, $options: 'i' } },
      { city: { $regex: search, $options: 'i' } },
    ];
  }

  const [items, total] = await Promise.all([
    Warehouse.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    Warehouse.countDocuments(filter),
  ]);

  return buildPagedResult({ items, total, page, limit });
}

async function createWarehouse(payload, actor, req) {
  const code = payload.code.toUpperCase();
  const existing = await Warehouse.findOne({ $or: [{ code }, { name: payload.name }] });
  if (existing) {
    throw AppError.conflict('Warehouse name or code already exists', 'WAREHOUSE_EXISTS');
  }

  if (payload.isDefault) {
    await Warehouse.updateMany({}, { $set: { isDefault: false } });
  }

  const warehouse = await Warehouse.create({
    name: payload.name,
    code,
    address: payload.address || '',
    city: payload.city || '',
    isDefault: Boolean(payload.isDefault),
    isActive: payload.isActive !== false,
  });

  await writeAuditLog({
    userId: actor._id,
    action: 'WAREHOUSE_CREATED',
    module: 'INVENTORY',
    recordId: warehouse._id.toString(),
    metadata: { code: warehouse.code },
    req,
  });

  return warehouse;
}

async function updateWarehouse(id, payload, actor, req) {
  const warehouse = await Warehouse.findById(id);
  if (!warehouse) throw AppError.notFound('Warehouse not found', 'WAREHOUSE_NOT_FOUND');

  if (payload.name !== undefined) warehouse.name = payload.name;
  if (payload.code !== undefined) warehouse.code = payload.code.toUpperCase();
  if (payload.address !== undefined) warehouse.address = payload.address;
  if (payload.city !== undefined) warehouse.city = payload.city;
  if (payload.isActive !== undefined) warehouse.isActive = payload.isActive;

  if (payload.isDefault === true) {
    await Warehouse.updateMany({ _id: { $ne: id } }, { $set: { isDefault: false } });
    warehouse.isDefault = true;
  } else if (payload.isDefault === false) {
    warehouse.isDefault = false;
  }

  await warehouse.save();

  await writeAuditLog({
    userId: actor._id,
    action: 'WAREHOUSE_UPDATED',
    module: 'INVENTORY',
    recordId: warehouse._id.toString(),
    metadata: { code: warehouse.code },
    req,
  });

  return warehouse;
}

async function deleteWarehouse(id, actor, req) {
  const warehouse = await Warehouse.findById(id);
  if (!warehouse) throw AppError.notFound('Warehouse not found', 'WAREHOUSE_NOT_FOUND');

  const Product = require('../models/Product');
  const inUse = await Product.countDocuments({ warehouse: id });
  if (inUse > 0) {
    throw AppError.badRequest('Warehouse is used by products and cannot be deleted', 'WAREHOUSE_IN_USE');
  }

  await warehouse.deleteOne();
  await writeAuditLog({
    userId: actor._id,
    action: 'WAREHOUSE_DELETED',
    module: 'INVENTORY',
    recordId: id,
    metadata: { code: warehouse.code },
    req,
  });

  return { id };
}

module.exports = {
  listWarehouses,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
};
