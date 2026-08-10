const statsService = require('../services/stats.service');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');

const getStats = asyncHandler(async function getStats(req, res) {
  const stats = await statsService.getStats();
  sendSuccess(res, 200, 'Statistics retrieved.', stats);
});

module.exports = { getStats };
