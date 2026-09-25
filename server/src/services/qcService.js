const QCInspection = require('../models/QCInspection');
const WorkOrder = require('../models/WorkOrder');
const AppError = require('../utils/AppError');
const { parseListQuery, buildPagedResult } = require('../utils/pagination');
const { writeAuditLog } = require('./auditService');
const { createNotification } = require('./notificationService');
const { nextDocumentNumber } = require('../utils/documentHelpers');

async function populateQC(id) {
  return QCInspection.findById(id)
    .populate('workOrder', 'workOrderNumber status quantity stockApplied')
    .populate('finishedProduct', 'name sku')
    .populate('inspectedBy', 'firstName lastName')
    .populate('createdBy', 'firstName lastName');
}

function deriveResult(passedQty, failedQty, inspectedQty) {
  if (failedQty <= 0 && passedQty >= inspectedQty) return 'PASSED';
  if (passedQty <= 0 && failedQty > 0) return 'FAILED';
  if (passedQty > 0 && failedQty > 0) return 'PARTIAL';
  return 'PENDING';
}

async function listInspections(query) {
  const { page, limit, skip, sort, status } = parseListQuery(query);
  const filter = {};
  if (status) filter.result = status.toUpperCase();
  if (query.result) filter.result = query.result.toUpperCase();
  if (query.workOrder) filter.workOrder = query.workOrder;

  const [items, total] = await Promise.all([
    QCInspection.find(filter)
      .populate('workOrder', 'workOrderNumber status')
      .populate('finishedProduct', 'name sku')
      .sort(sort || { createdAt: -1 })
      .skip(skip)
      .limit(limit),
    QCInspection.countDocuments(filter),
  ]);
  return buildPagedResult({ items, total, page, limit });
}

async function getInspection(id) {
  const inspection = await populateQC(id);
  if (!inspection) throw AppError.notFound('QC inspection not found', 'QC_NOT_FOUND');
  return inspection;
}

async function createInspection(payload, actor, req) {
  const wo = await WorkOrder.findById(payload.workOrder);
  if (!wo) throw AppError.notFound('Work order not found', 'WO_NOT_FOUND');
  if (wo.status !== 'COMPLETED') {
    throw AppError.badRequest('QC can only be created for completed work orders', 'WO_NOT_COMPLETED');
  }

  const existing = await QCInspection.findOne({ workOrder: wo._id, result: { $ne: 'PENDING' } });
  if (existing) {
    throw AppError.conflict('Work order already has a completed QC inspection', 'QC_EXISTS');
  }

  const inspectedQty = Number(payload.inspectedQty ?? wo.quantity);
  if (inspectedQty <= 0 || inspectedQty > wo.quantity) {
    throw AppError.badRequest('Inspected qty must be between 1 and WO quantity', 'INVALID_INSPECTED_QTY');
  }

  const inspectionNumber = await nextDocumentNumber(QCInspection, 'inspectionNumber', 'QC');
  const inspection = await QCInspection.create({
    inspectionNumber,
    workOrder: wo._id,
    finishedProduct: wo.finishedProduct,
    inspectedQty,
    passedQty: 0,
    failedQty: 0,
    result: 'PENDING',
    defectNotes: payload.defectNotes || '',
    createdBy: actor._id,
  });

  await writeAuditLog({
    userId: actor._id,
    action: 'QC_CREATED',
    module: 'MANUFACTURING',
    recordId: inspection._id.toString(),
    metadata: { inspectionNumber, workOrder: wo.workOrderNumber },
    req,
  });

  return populateQC(inspection._id);
}

async function completeInspection(id, payload, actor, req) {
  const inspection = await QCInspection.findById(id);
  if (!inspection) throw AppError.notFound('QC inspection not found', 'QC_NOT_FOUND');
  if (inspection.result !== 'PENDING') {
    throw AppError.badRequest('Inspection already completed', 'QC_ALREADY_DONE');
  }

  const passedQty = Number(payload.passedQty ?? 0);
  const failedQty = Number(payload.failedQty ?? 0);
  if (passedQty < 0 || failedQty < 0) {
    throw AppError.badRequest('Quantities cannot be negative', 'INVALID_QC_QTY');
  }
  if (passedQty + failedQty !== inspection.inspectedQty) {
    throw AppError.badRequest(
      `passedQty + failedQty must equal inspectedQty (${inspection.inspectedQty})`,
      'QC_QTY_MISMATCH'
    );
  }

  inspection.passedQty = passedQty;
  inspection.failedQty = failedQty;
  inspection.result = deriveResult(passedQty, failedQty, inspection.inspectedQty);
  inspection.defectNotes = payload.defectNotes !== undefined ? payload.defectNotes : inspection.defectNotes;
  inspection.inspectedAt = new Date();
  inspection.inspectedBy = actor._id;
  await inspection.save();

  await writeAuditLog({
    userId: actor._id,
    action: `QC_${inspection.result}`,
    module: 'MANUFACTURING',
    recordId: id,
    metadata: {
      inspectionNumber: inspection.inspectionNumber,
      passedQty,
      failedQty,
      result: inspection.result,
    },
    req,
  });

  createNotification({
    userId: actor._id,
    title: `QC ${inspection.result.toLowerCase()}`,
    message: `${inspection.inspectionNumber}: ${passedQty} passed, ${failedQty} failed.`,
    type: inspection.result === 'PASSED' ? 'SUCCESS' : 'WARNING',
    module: 'MANUFACTURING',
    link: '/manufacturing/qc',
  });

  return populateQC(id);
}

module.exports = {
  listInspections,
  getInspection,
  createInspection,
  completeInspection,
};
