/**
 * Shared list query helper: page, limit, search, sort, date range.
 */
function parseListQuery(query, { defaultSort = '-createdAt', maxLimit = 100 } = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || 10));
  const skip = (page - 1) * limit;
  const search = (query.search || '').trim();
  const sort = query.sort || defaultSort;
  const status = query.status || undefined;
  const from = query.from ? new Date(query.from) : null;
  const to = query.to ? new Date(query.to) : null;

  const dateFilter = {};
  if (from && !Number.isNaN(from.getTime())) {
    dateFilter.$gte = from;
  }
  if (to && !Number.isNaN(to.getTime())) {
    dateFilter.$lte = to;
  }

  return {
    page,
    limit,
    skip,
    search,
    sort,
    status,
    dateFilter: Object.keys(dateFilter).length ? dateFilter : null,
  };
}

function buildPagedResult({ items, total, page, limit }) {
  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  };
}

module.exports = {
  parseListQuery,
  buildPagedResult,
};
