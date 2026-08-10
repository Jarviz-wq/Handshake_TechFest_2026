const adminDashboardService = require('../services/adminDashboard.service');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');

const getDashboard = asyncHandler(async function getDashboard(req, res) {
  const data = await adminDashboardService.getOrganizerDashboard();
  sendSuccess(res, 200, 'Organizer dashboard retrieved.', data);
});

module.exports = { getDashboard };
