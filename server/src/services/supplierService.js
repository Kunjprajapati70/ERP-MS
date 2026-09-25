const Supplier = require('../models/Supplier');
const AppError = require('../utils/AppError');
const { parseListQuery, buildPagedResult } = require('../utils/pagination');
const { writeAuditLog } = require('./auditService');
const { nextDocumentNumber } = require('../utils/documentHelpers');

async function listSuppliers(query) {
  const { page, limit, skip, search, sort, status } = parseListQuery(query);
  const filter = {};
  if (status) filter.status = status.toUpperCase();
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { code: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
    ];
  }

  const [items, total] = await Promise.all([
    Supplier.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    Supplier.countDocuments(filter),
  ]);
  return buildPagedResult({ items, total, page, limit });
}

async function getSupplier(id) {
  const supplier = await Supplier.findById(id).lean();
  if (!supplier) throw AppError.notFound('Supplier not found', 'SUPPLIER_NOT_FOUND');
  return supplier;
}

async function createSupplier(payload, actor, req) {
  const code = payload.code
    ? payload.code.toUpperCase()
    : await nextDocumentNumber(Supplier, 'code', 'SUP');

  const exists = await Supplier.findOne({ code });
  if (exists) throw AppError.conflict('Supplier code already exists', 'SUPPLIER_EXISTS');

  const supplier = await Supplier.create({ ...payload, code });
  await writeAuditLog({
    userId: actor._id,
    action: 'SUPPLIER_CREATED',
    module: 'SUPPLIERS',
    recordId: supplier._id.toString(),
    metadata: { code },
    req,
  });
  return supplier;
}

async function updateSupplier(id, payload, actor, req) {
  const supplier = await Supplier.findById(id);
  if (!supplier) throw AppError.notFound('Supplier not found', 'SUPPLIER_NOT_FOUND');

  const fields = [
    'name',
    'email',
    'phone',
    'contactPerson',
    'gstin',
    'address',
    'city',
    'paymentTerms',
    'status',
    'notes',
  ];
  fields.forEach((f) => {
    if (payload[f] !== undefined) supplier[f] = payload[f];
  });
  if (payload.code) supplier.code = payload.code.toUpperCase();

  await supplier.save();
  await writeAuditLog({
    userId: actor._id,
    action: 'SUPPLIER_UPDATED',
    module: 'SUPPLIERS',
    recordId: id,
    metadata: { code: supplier.code },
    req,
  });
  return supplier;
}

async function deleteSupplier(id, actor, req) {
  const PurchaseOrder = require('../models/PurchaseOrder');
  const inUse = await PurchaseOrder.countDocuments({
    supplier: id,
    status: { $nin: ['CANCELLED'] },
  });
  if (inUse > 0) {
    throw AppError.badRequest('Supplier has active purchase orders', 'SUPPLIER_IN_USE');
  }

  const supplier = await Supplier.findById(id);
  if (!supplier) throw AppError.notFound('Supplier not found', 'SUPPLIER_NOT_FOUND');
  await supplier.deleteOne();
  await writeAuditLog({
    userId: actor._id,
    action: 'SUPPLIER_DELETED',
    module: 'SUPPLIERS',
    recordId: id,
    metadata: { code: supplier.code },
    req,
  });
  return { id };
}

module.exports = {
  listSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier,
  deleteSupplier,
};
