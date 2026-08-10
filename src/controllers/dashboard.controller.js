const dashboardService = require('../services/dashboard.service');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');

const getDashboard = asyncHandler(async function getDashboard(req, res) {
  const data = await dashboardService.getDashboard(req.user);
  sendSuccess(res, 200, 'Dashboard data retrieved.', data);
});

module.exports = { getDashboard };
