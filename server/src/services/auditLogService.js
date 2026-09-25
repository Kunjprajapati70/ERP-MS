const AuditLog = require('../models/AuditLog');
const { parseListQuery, buildPagedResult } = require('../utils/pagination');

async function listAuditLogs(query) {
  const { page, limit, skip, search, sort, dateFilter } = parseListQuery(query);
  const filter = {};

  if (query.module) {
    filter.module = query.module.toUpperCase();
  }
  if (query.action) {
    filter.action = query.action;
  }
  if (query.userId) {
    filter.user = query.userId;
  }
  if (dateFilter) {
    filter.createdAt = dateFilter;
  }
  if (search) {
    filter.$or = [
      { action: { $regex: search, $options: 'i' } },
      { module: { $regex: search, $options: 'i' } },
      { recordId: { $regex: search, $options: 'i' } },
    ];
  }

  const [items, total] = await Promise.all([
    AuditLog.find(filter)
      .populate('user', 'firstName lastName email')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    AuditLog.countDocuments(filter),
  ]);

  return buildPagedResult({ items, total, page, limit });
}

module.exports = {
  listAuditLogs,
};
