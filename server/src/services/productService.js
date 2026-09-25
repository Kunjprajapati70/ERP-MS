const Product = require('../models/Product');
const StockTransaction = require('../models/StockTransaction');
const Category = require('../models/Category');
const Warehouse = require('../models/Warehouse');
const AppError = require('../utils/AppError');
const { parseListQuery, buildPagedResult } = require('../utils/pagination');
const { writeAuditLog } = require('./auditService');
const { applyStockChange, adjustStock } = require('./inventoryService');

function serializeProduct(product) {
  const obj = product.toObject ? product.toObject({ virtuals: true }) : product;
  return obj;
}

async function listProducts(query) {
  const { page, limit, skip, search, sort, status } = parseListQuery(query);
  const filter = {};

  if (status) filter.status = status.toUpperCase();
  if (query.category) filter.category = query.category;
  if (query.warehouse) filter.warehouse = query.warehouse;
  if (query.stockStatus === 'LOW_STOCK') {
    filter.$expr = { $and: [{ $gt: ['$minimumStock', 0] }, { $lte: ['$currentStock', '$minimumStock'] }] };
  } else if (query.stockStatus === 'OUT_OF_STOCK') {
    filter.currentStock = { $lte: 0 };
  } else if (query.stockStatus === 'IN_STOCK') {
    filter.$expr = {
      $or: [
        { $eq: ['$minimumStock', 0] },
        { $gt: ['$currentStock', '$minimumStock'] },
      ],
    };
    filter.currentStock = { $gt: 0 };
  }

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { sku: { $regex: search, $options: 'i' } },
      { brand: { $regex: search, $options: 'i' } },
      { barcode: { $regex: search, $options: 'i' } },
    ];
  }

  const [items, total] = await Promise.all([
    Product.find(filter)
      .populate('category', 'name code')
      .populate('warehouse', 'name code')
      .sort(sort)
      .skip(skip)
      .limit(limit),
    Product.countDocuments(filter),
  ]);

  return buildPagedResult({
    items: items.map(serializeProduct),
    total,
    page,
    limit,
  });
}

async function getProductById(id) {
  const product = await Product.findById(id)
    .populate('category', 'name code')
    .populate('warehouse', 'name code');
  if (!product) throw AppError.notFound('Product not found', 'PRODUCT_NOT_FOUND');
  return serializeProduct(product);
}

async function createProduct(payload, actor, req) {
  const sku = payload.sku.toUpperCase().trim();
  const existing = await Product.findOne({ sku });
  if (existing) {
    throw AppError.conflict('SKU already exists', 'SKU_EXISTS');
  }

  if (payload.category) {
    const cat = await Category.findById(payload.category);
    if (!cat) throw AppError.badRequest('Invalid category', 'INVALID_CATEGORY');
  }
  if (payload.warehouse) {
    const wh = await Warehouse.findById(payload.warehouse);
    if (!wh) throw AppError.badRequest('Invalid warehouse', 'INVALID_WAREHOUSE');
  }

  const openingStock = Number(payload.openingStock || 0);
  const product = await Product.create({
    name: payload.name,
    sku,
    barcode: payload.barcode || '',
    category: payload.category || null,
    brand: payload.brand || '',
    description: payload.description || '',
    purchasePrice: payload.purchasePrice ?? 0,
    sellingPrice: payload.sellingPrice ?? 0,
    taxPercent: payload.taxPercent ?? 0,
    currentStock: 0,
    minimumStock: payload.minimumStock ?? 0,
    maximumStock: payload.maximumStock ?? 0,
    unit: (payload.unit || 'PCS').toUpperCase(),
    warehouse: payload.warehouse || null,
    imageUrl: payload.imageUrl || '',
    visibleToCustomers: payload.visibleToCustomers !== false,
    status: payload.status || 'ACTIVE',
  });

  if (openingStock > 0) {
    await applyStockChange({
      productId: product._id,
      quantity: openingStock,
      type: 'OPENING',
      warehouseId: product.warehouse,
      unitCost: product.purchasePrice,
      notes: 'Opening stock',
      userId: actor._id,
      req,
      skipLowStockNotify: true,
    });
  }

  const fresh = await Product.findById(product._id)
    .populate('category', 'name code')
    .populate('warehouse', 'name code');

  await writeAuditLog({
    userId: actor._id,
    action: 'PRODUCT_CREATED',
    module: 'PRODUCTS',
    recordId: product._id.toString(),
    metadata: { sku, name: product.name },
    req,
  });

  return serializeProduct(fresh);
}

async function updateProduct(id, payload, actor, req) {
  const product = await Product.findById(id);
  if (!product) throw AppError.notFound('Product not found', 'PRODUCT_NOT_FOUND');

  if (payload.sku && payload.sku.toUpperCase() !== product.sku) {
    const clash = await Product.findOne({ sku: payload.sku.toUpperCase() });
    if (clash) throw AppError.conflict('SKU already exists', 'SKU_EXISTS');
    product.sku = payload.sku.toUpperCase();
  }

  const fields = [
    'name',
    'barcode',
    'brand',
    'description',
    'purchasePrice',
    'sellingPrice',
    'taxPercent',
    'minimumStock',
    'maximumStock',
    'unit',
    'imageUrl',
    'visibleToCustomers',
    'status',
  ];
  fields.forEach((f) => {
    if (payload[f] !== undefined) product[f] = payload[f];
  });
  if (payload.category !== undefined) product.category = payload.category || null;
  if (payload.warehouse !== undefined) product.warehouse = payload.warehouse || null;
  if (payload.unit) product.unit = String(payload.unit).toUpperCase();
  if (payload.visibleToCustomers !== undefined) {
    product.visibleToCustomers = Boolean(payload.visibleToCustomers);
  }

  await product.save();

  const fresh = await Product.findById(id)
    .populate('category', 'name code')
    .populate('warehouse', 'name code');

  await writeAuditLog({
    userId: actor._id,
    action: 'PRODUCT_UPDATED',
    module: 'PRODUCTS',
    recordId: id,
    metadata: { sku: product.sku },
    req,
  });

  return serializeProduct(fresh);
}

async function deleteProduct(id, actor, req) {
  const product = await Product.findById(id);
  if (!product) throw AppError.notFound('Product not found', 'PRODUCT_NOT_FOUND');

  await StockTransaction.deleteMany({ product: id });
  await product.deleteOne();

  await writeAuditLog({
    userId: actor._id,
    action: 'PRODUCT_DELETED',
    module: 'PRODUCTS',
    recordId: id,
    metadata: { sku: product.sku },
    req,
  });

  return { id };
}

async function listStockLedger(query) {
  const { page, limit, skip, sort } = parseListQuery(query);
  const filter = {};
  if (query.product) filter.product = query.product;
  if (query.warehouse) filter.warehouse = query.warehouse;
  if (query.type) filter.type = query.type.toUpperCase();

  const [items, total] = await Promise.all([
    StockTransaction.find(filter)
      .populate('product', 'name sku unit')
      .populate('warehouse', 'name code')
      .populate('createdBy', 'firstName lastName email')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    StockTransaction.countDocuments(filter),
  ]);

  return buildPagedResult({ items, total, page, limit });
}

async function getInventorySummary() {
  const [totalProducts, lowStock, outOfStock, valuation] = await Promise.all([
    Product.countDocuments({ status: 'ACTIVE' }),
    Product.countDocuments({
      status: 'ACTIVE',
      $expr: { $and: [{ $gt: ['$minimumStock', 0] }, { $lte: ['$currentStock', '$minimumStock'] }] },
    }),
    Product.countDocuments({ status: 'ACTIVE', currentStock: { $lte: 0 } }),
    Product.aggregate([
      { $match: { status: 'ACTIVE' } },
      {
        $group: {
          _id: null,
          value: { $sum: { $multiply: ['$currentStock', '$purchasePrice'] } },
          units: { $sum: '$currentStock' },
        },
      },
    ]),
  ]);

  return {
    totalProducts,
    lowStock,
    outOfStock,
    inventoryValue: valuation[0]?.value || 0,
    totalUnits: valuation[0]?.units || 0,
  };
}

async function adjustProductStock(productId, payload, actor, req) {
  const quantity = Number(payload.quantity);
  if (!quantity || Number.isNaN(quantity)) {
    throw AppError.badRequest('Quantity is required', 'INVALID_QUANTITY');
  }

  const result = await adjustStock({
    productId,
    quantity,
    notes: payload.notes,
    warehouseId: payload.warehouse || null,
    userId: actor._id,
    req,
  });

  const fresh = await Product.findById(productId)
    .populate('category', 'name code')
    .populate('warehouse', 'name code');

  return {
    product: serializeProduct(fresh),
    transaction: result.transaction,
  };
}

module.exports = {
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  listStockLedger,
  getInventorySummary,
  adjustProductStock,
};
