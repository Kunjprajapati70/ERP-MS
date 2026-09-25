const auditLogService = require('../services/auditLogService');
const asyncHandler = require('../utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const data = await auditLogService.listAuditLogs(req.query);
  res.json({ success: true, message: 'Audit logs retrieved', data });
});

module.exports = { list };
