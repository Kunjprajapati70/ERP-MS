const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

async function writeAuditLog({
  userId = null,
  action,
  module = 'SYSTEM',
  recordId = null,
  metadata = {},
  req = null,
}) {
  try {
    await AuditLog.create({
      user: userId,
      action,
      module,
      recordId,
      metadata,
      ipAddress: req?.ip || '',
      userAgent: req?.get?.('user-agent') || '',
    });
  } catch (error) {
    logger.error('Failed to write audit log', { message: error.message, action, module });
  }
}

module.exports = {
  writeAuditLog,
};
