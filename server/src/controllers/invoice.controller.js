const invoiceService = require('../services/invoiceService');
const asyncHandler = require('../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const data = await invoiceService.listInvoices(req.query);
  res.json({ success: true, message: 'Invoices retrieved', data });
});

const getById = asyncHandler(async (req, res) => {
  const invoice = await invoiceService.getInvoice(req.params.id);
  res.json({ success: true, message: 'Invoice retrieved', data: { invoice } });
});

const createFromSalesOrder = asyncHandler(async (req, res) => {
  const invoice = await invoiceService.createInvoiceFromSalesOrder(
    req.params.salesOrderId,
    req.body,
    req.user,
    req
  );
  res.status(201).json({ success: true, message: 'Invoice created from sales order', data: { invoice } });
});

module.exports = { list, getById, createFromSalesOrder };
