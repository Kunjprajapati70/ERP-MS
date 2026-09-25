const Lead = require('../models/Lead');
const Customer = require('../models/Customer');
const AppError = require('../utils/AppError');
const { parseListQuery, buildPagedResult } = require('../utils/pagination');
const { writeAuditLog } = require('./auditService');
const { nextDocumentNumber } = require('../utils/documentHelpers');

async function populateLead(id) {
  return Lead.findById(id)
    .populate('owner', 'firstName lastName email')
    .populate('createdBy', 'firstName lastName')
    .populate('convertedCustomer', 'name code');
}

async function listLeads(query) {
  const { page, limit, skip, search, sort, status } = parseListQuery(query);
  const filter = {};
  if (status) filter.status = status.toUpperCase();
  if (query.source) filter.source = query.source.toUpperCase();
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { company: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { code: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
    ];
  }

  const [items, total] = await Promise.all([
    Lead.find(filter)
      .populate('owner', 'firstName lastName')
      .sort(sort)
      .skip(skip)
      .limit(limit),
    Lead.countDocuments(filter),
  ]);

  return buildPagedResult({ items, total, page, limit });
}

async function getLead(id) {
  const lead = await populateLead(id);
  if (!lead) throw AppError.notFound('Lead not found', 'LEAD_NOT_FOUND');
  return lead;
}

async function createLead(payload, actor, req) {
  const code = await nextDocumentNumber(Lead, 'code', 'LEAD');
  const lead = await Lead.create({
    code,
    name: payload.name,
    company: payload.company || '',
    email: payload.email || '',
    phone: payload.phone || '',
    source: payload.source || 'OTHER',
    status: payload.status || 'NEW',
    estimatedValue: Number(payload.estimatedValue || 0),
    notes: payload.notes || '',
    owner: payload.owner || actor._id,
    createdBy: actor._id,
  });

  await writeAuditLog({
    userId: actor._id,
    action: 'LEAD_CREATED',
    module: 'CRM',
    recordId: lead._id.toString(),
    metadata: { code },
    req,
  });

  return populateLead(lead._id);
}

async function updateLead(id, payload, actor, req) {
  const lead = await Lead.findById(id);
  if (!lead) throw AppError.notFound('Lead not found', 'LEAD_NOT_FOUND');

  const fields = [
    'name',
    'company',
    'email',
    'phone',
    'source',
    'status',
    'estimatedValue',
    'notes',
    'owner',
  ];
  fields.forEach((f) => {
    if (payload[f] !== undefined) lead[f] = payload[f];
  });

  await lead.save();
  await writeAuditLog({
    userId: actor._id,
    action: 'LEAD_UPDATED',
    module: 'CRM',
    recordId: id,
    metadata: { code: lead.code, status: lead.status },
    req,
  });
  return populateLead(id);
}

async function convertLead(id, payload, actor, req) {
  const lead = await Lead.findById(id);
  if (!lead) throw AppError.notFound('Lead not found', 'LEAD_NOT_FOUND');
  if (lead.status === 'LOST') {
    throw AppError.badRequest('Cannot convert a lost lead', 'LEAD_LOST');
  }
  if (lead.convertedCustomer) {
    throw AppError.conflict('Lead already converted', 'LEAD_ALREADY_CONVERTED');
  }

  const code = payload.code
    ? payload.code.toUpperCase()
    : await nextDocumentNumber(Customer, 'code', 'CUST');

  const exists = await Customer.findOne({ code });
  if (exists) throw AppError.conflict('Customer code already exists', 'CUSTOMER_EXISTS');

  const customer = await Customer.create({
    code,
    name: payload.name || lead.name,
    email: payload.email || lead.email || '',
    phone: payload.phone || lead.phone || '',
    company: payload.company || lead.company || '',
    city: payload.city || '',
    status: 'ACTIVE',
    notes: payload.notes || `Converted from lead ${lead.code}`,
  });

  lead.status = 'WON';
  lead.convertedCustomer = customer._id;
  await lead.save();

  await writeAuditLog({
    userId: actor._id,
    action: 'LEAD_CONVERTED',
    module: 'CRM',
    recordId: id,
    metadata: { leadCode: lead.code, customerCode: customer.code },
    req,
  });

  return {
    lead: await populateLead(id),
    customer,
  };
}

async function deleteLead(id, actor, req) {
  const lead = await Lead.findById(id);
  if (!lead) throw AppError.notFound('Lead not found', 'LEAD_NOT_FOUND');
  if (lead.convertedCustomer) {
    throw AppError.badRequest('Converted leads cannot be deleted', 'LEAD_CONVERTED');
  }
  await lead.deleteOne();
  await writeAuditLog({
    userId: actor._id,
    action: 'LEAD_DELETED',
    module: 'CRM',
    recordId: id,
    metadata: { code: lead.code },
    req,
  });
  return { id };
}

module.exports = {
  listLeads,
  getLead,
  createLead,
  updateLead,
  convertLead,
  deleteLead,
};
