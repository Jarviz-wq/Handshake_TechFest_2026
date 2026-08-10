const profileService = require('../services/profile.service');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');

const getPublicProfile = asyncHandler(async function getPublicProfile(req, res) {
  const { username } = req.params;
  const profile = await profileService.getPublicProfile(username);
  sendSuccess(res, 200, 'Profile retrieved.', profile);
});

module.exports = { getPublicProfile };
