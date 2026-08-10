const adminParticipantService = require('../services/adminParticipant.service');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');

const list = asyncHandler(async function list(req, res) {
  const data = await adminParticipantService.listParticipants(req.query);
  sendSuccess(res, 200, 'Participants retrieved.', data);
});

const activate = asyncHandler(async function activate(req, res) {
  const participant = await adminParticipantService.setParticipantActive(
    req.params.username,
    true,
    req.user.id
  );
  sendSuccess(res, 200, 'Participant activated.', { participant });
});

const deactivate = asyncHandler(async function deactivate(req, res) {
  const participant = await adminParticipantService.setParticipantActive(
    req.params.username,
    false,
    req.user.id
  );
  sendSuccess(res, 200, 'Participant deactivated.', { participant });
});

const resetPassword = asyncHandler(async function resetPassword(req, res) {
  const result = await adminParticipantService.resetParticipantPassword(req.params.username, req.user.id);
  sendSuccess(
    res,
    200,
    'Password reset. Share this new password with the participant now — it will not be shown again.',
    result
  );
});

module.exports = { list, activate, deactivate, resetPassword };
