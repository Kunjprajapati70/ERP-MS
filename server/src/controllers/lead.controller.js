const leadService = require('../services/leadService');
const asyncHandler = require('../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const data = await leadService.listLeads(req.query);
  res.json({ success: true, message: 'Leads retrieved', data });
});

const getById = asyncHandler(async (req, res) => {
  const lead = await leadService.getLead(req.params.id);
  res.json({ success: true, message: 'Lead retrieved', data: { lead } });
});

const create = asyncHandler(async (req, res) => {
  const lead = await leadService.createLead(req.body, req.user, req);
  res.status(201).json({ success: true, message: 'Lead created', data: { lead } });
});

const update = asyncHandler(async (req, res) => {
  const lead = await leadService.updateLead(req.params.id, req.body, req.user, req);
  res.json({ success: true, message: 'Lead updated', data: { lead } });
});

const convert = asyncHandler(async (req, res) => {
  const data = await leadService.convertLead(req.params.id, req.body, req.user, req);
  res.json({ success: true, message: 'Lead converted to customer', data });
});

const remove = asyncHandler(async (req, res) => {
  const data = await leadService.deleteLead(req.params.id, req.user, req);
  res.json({ success: true, message: 'Lead deleted', data });
});

module.exports = { list, getById, create, update, convert, remove };
