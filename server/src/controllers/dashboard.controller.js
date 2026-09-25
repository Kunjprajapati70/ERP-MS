const dashboardService = require('../services/dashboardService');
const asyncHandler = require('../utils/asyncHandler');

const overview = asyncHandler(async (req, res) => {
  const data = await dashboardService.getDashboardOverview();
  res.json({ success: true, message: 'Dashboard overview retrieved', data });
});

const salesTrend = asyncHandler(async (req, res) => {
  const days = Math.min(Math.max(Number(req.query.days) || 14, 7), 90);
  const series = await dashboardService.getSalesTrend(days);
  res.json({ success: true, message: 'Sales trend retrieved', data: { days, series } });
});

module.exports = { overview, salesTrend };
