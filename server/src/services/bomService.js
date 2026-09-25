const BOM = require('../models/BOM');
const Product = require('../models/Product');
const AppError = require('../utils/AppError');
const { parseListQuery, buildPagedResult } = require('../utils/pagination');
const { writeAuditLog } = require('./auditService');
const { nextDocumentNumber } = require('../utils/documentHelpers');

async function populateBOM(id) {
  return BOM.findById(id)
    .populate('finishedProduct', 'name sku currentStock unit')
    .populate('components.product', 'name sku currentStock unit purchasePrice')
    .populate('createdBy', 'firstName lastName');
}

async function validateComponents(components, finishedProductId) {
  if (!Array.isArray(components) || !components.length) {
    throw AppError.badRequest('At least one component is required', 'EMPTY_BOM_COMPONENTS');
  }

  const seen = new Set();
  const normalized = [];
  for (const line of components) {
    const productId = String(line.product);
    if (productId === String(finishedProductId)) {
      throw AppError.badRequest('Finished product cannot be a component of itself', 'BOM_SELF_REF');
    }
    if (seen.has(productId)) {
      throw AppError.badRequest('Duplicate component in BOM', 'BOM_DUPLICATE_COMPONENT');
    }
    seen.add(productId);

    const product = await Product.findById(line.product);
    if (!product || product.status === 'DISCONTINUED') {
      throw AppError.badRequest(`Invalid component product: ${line.product}`, 'INVALID_COMPONENT');
    }
    const qty = Number(line.quantity);
    if (!qty || qty <= 0) {
      throw AppError.badRequest('Component quantity must be positive', 'INVALID_COMPONENT_QTY');
    }
    normalized.push({
      product: product._id,
      quantity: qty,
      notes: line.notes || '',
    });
  }
  return normalized;
}

async function listBOMs(query) {
  const { page, limit, skip, search, sort } = parseListQuery(query);
  const filter = {};
  if (query.isActive !== undefined) {
    filter.isActive = query.isActive === 'true' || query.isActive === true;
  }
  if (search) {
    filter.$or = [
      { code: { $regex: search, $options: 'i' } },
      { name: { $regex: search, $options: 'i' } },
    ];
  }

  const [items, total] = await Promise.all([
    BOM.find(filter)
      .populate('finishedProduct', 'name sku')
      .sort(sort)
      .skip(skip)
      .limit(limit),
    BOM.countDocuments(filter),
  ]);
  return buildPagedResult({ items, total, page, limit });
}

async function getBOM(id) {
  const bom = await populateBOM(id);
  if (!bom) throw AppError.notFound('BOM not found', 'BOM_NOT_FOUND');
  return bom;
}

async function createBOM(payload, actor, req) {
  const finished = await Product.findById(payload.finishedProduct);
  if (!finished || finished.status !== 'ACTIVE') {
    throw AppError.badRequest('Active finished product is required', 'INVALID_FINISHED_PRODUCT');
  }

  const components = await validateComponents(payload.components, finished._id);
  const code = payload.code
    ? payload.code.toUpperCase()
    : await nextDocumentNumber(BOM, 'code', 'BOM');

  const exists = await BOM.findOne({ code });
  if (exists) throw AppError.conflict('BOM code already exists', 'BOM_EXISTS');

  const bom = await BOM.create({
    code,
    name: payload.name,
    finishedProduct: finished._id,
    components,
    version: payload.version || 1,
    isActive: payload.isActive !== false,
    notes: payload.notes || '',
    createdBy: actor._id,
  });

  await writeAuditLog({
    userId: actor._id,
    action: 'BOM_CREATED',
    module: 'MANUFACTURING',
    recordId: bom._id.toString(),
    metadata: { code },
    req,
  });

  return populateBOM(bom._id);
}

async function updateBOM(id, payload, actor, req) {
  const bom = await BOM.findById(id);
  if (!bom) throw AppError.notFound('BOM not found', 'BOM_NOT_FOUND');

  if (payload.name !== undefined) bom.name = payload.name;
  if (payload.notes !== undefined) bom.notes = payload.notes;
  if (payload.isActive !== undefined) bom.isActive = payload.isActive;
  if (payload.version !== undefined) bom.version = payload.version;

  if (payload.finishedProduct) {
    const finished = await Product.findById(payload.finishedProduct);
    if (!finished) throw AppError.badRequest('Invalid finished product', 'INVALID_FINISHED_PRODUCT');
    bom.finishedProduct = finished._id;
  }

  if (payload.components) {
    bom.components = await validateComponents(payload.components, bom.finishedProduct);
  }

  await bom.save();
  await writeAuditLog({
    userId: actor._id,
    action: 'BOM_UPDATED',
    module: 'MANUFACTURING',
    recordId: id,
    metadata: { code: bom.code },
    req,
  });
  return populateBOM(id);
}

async function deleteBOM(id, actor, req) {
  const bom = await BOM.findById(id);
  if (!bom) throw AppError.notFound('BOM not found', 'BOM_NOT_FOUND');
  const WorkOrder = require('../models/WorkOrder');
  const linked = await WorkOrder.countDocuments({
    bom: id,
    status: { $in: ['DRAFT', 'RELEASED', 'IN_PROGRESS'] },
  });
  if (linked > 0) {
    throw AppError.badRequest('Cannot delete BOM with open work orders', 'BOM_IN_USE');
  }
  await bom.deleteOne();
  await writeAuditLog({
    userId: actor._id,
    action: 'BOM_DELETED',
    module: 'MANUFACTURING',
    recordId: id,
    metadata: { code: bom.code },
    req,
  });
  return { id };
}

module.exports = {
  listBOMs,
  getBOM,
  createBOM,
  updateBOM,
  deleteBOM,
  populateBOM,
};
