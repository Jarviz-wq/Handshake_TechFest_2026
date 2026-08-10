const leaderboardService = require('../services/leaderboard.service');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');

const getLeaderboard = asyncHandler(async function getLeaderboard(req, res) {
  const { page, limit } = req.query;
  const { entries, pagination } = await leaderboardService.getLeaderboard(page, limit);
  sendSuccess(res, 200, 'Leaderboard retrieved.', { entries, pagination });
});

module.exports = { getLeaderboard };
