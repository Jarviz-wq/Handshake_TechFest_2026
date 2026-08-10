// Controllers stay thin by design: parse request, call one service method,
// shape the response. No business logic lives here — see auth.service.js.

const authService = require('../services/auth.service');
const userService = require('../services/user.service');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');

const login = asyncHandler(async function login(req, res) {
  const { username, password } = req.body;
  const { token, user } = await authService.login(username, password);

  sendSuccess(res, 200, 'Login successful.', { token, user });
});

const me = asyncHandler(async function me(req, res) {
  const rank = await userService.getRank(req.user.id, req.user.handshakeCount, req.user.lastVerifiedHandshakeAt);
  sendSuccess(res, 200, 'Profile retrieved.', {
    user: userService.toPublicProfile(req.user, rank),
  });
});

module.exports = { login, me };
