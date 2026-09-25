const Product = require('../models/Product');
const StockTransaction = require('../models/StockTransaction');
const AppError = require('../utils/AppError');
const { createNotification } = require('./notificationService');
const { writeAuditLog } = require('./auditService');
const logger = require('../utils/logger');

/**
 * Single entry-point for all stock mutations.
 * Positive quantity increases stock; negative decreases.
 */
async function applyStockChange({
  productId,
  quantity,
  type,
  warehouseId = null,
  unitCost = 0,
  referenceType = '',
  referenceId = '',
  notes = '',
  userId = null,
  session = null,
  req = null,
  skipLowStockNotify = false,
}) {
  if (!quantity || quantity === 0) {
    throw AppError.badRequest('Stock quantity change cannot be zero', 'INVALID_QUANTITY');
  }

  const opts = session ? { session } : {};
  const product = await Product.findById(productId).session(session || null);
  if (!product) {
    throw AppError.notFound('Product not found', 'PRODUCT_NOT_FOUND');
  }

  const nextStock = product.currentStock + quantity;
  if (nextStock < 0) {
    throw AppError.badRequest(
      `Insufficient stock for ${product.sku}. Available: ${product.currentStock}`,
      'INSUFFICIENT_STOCK'
    );
  }

  product.currentStock = Math.max(0, nextStock);
  if (warehouseId) {
    product.warehouse = warehouseId;
  }
  await product.save(opts);

  const txnPayload = {
    product: product._id,
    warehouse: warehouseId || product.warehouse || null,
    type,
    quantity,
    balanceAfter: nextStock,
    unitCost: unitCost || product.purchasePrice || 0,
    referenceType,
    referenceId,
    notes,
    createdBy: userId,
  };

  let txn;
  if (session) {
    [txn] = await StockTransaction.create([txnPayload], { session });
  } else {
    txn = await StockTransaction.create(txnPayload);
  }

  await writeAuditLog({
    userId,
    action: 'STOCK_TRANSACTION',
    module: 'INVENTORY',
    recordId: txn._id.toString(),
    metadata: {
      productId: product._id.toString(),
      sku: product.sku,
      type,
      quantity,
      balanceAfter: nextStock,
    },
    req,
  });

  if (
    !skipLowStockNotify &&
    product.minimumStock > 0 &&
    nextStock <= product.minimumStock &&
    userId
  ) {
    createNotification({
      userId,
      title: 'Low stock alert',
      message: `${product.name} (${product.sku}) is at ${nextStock} ${product.unit}. Minimum is ${product.minimumStock}.`,
      type: 'WARNING',
      module: 'INVENTORY',
      link: '/operations/products',
      metadata: { productId: product._id.toString() },
    }).catch((err) => logger.error('Low stock notify failed', { message: err.message }));
  }

  return { product, transaction: txn };
}

async function adjustStock({ productId, quantity, notes, warehouseId, userId, req }) {
  return applyStockChange({
    productId,
    quantity,
    type: 'ADJUSTMENT',
    warehouseId,
    notes: notes || 'Manual stock adjustment',
    userId,
    req,
  });
}

module.exports = {
  applyStockChange,
  adjustStock,
};
