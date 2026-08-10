const prisma = require('../db/client');
const AppError = require('../utils/AppError');
const { getRank, toPublicMinimalProfile } = require('./user.service');

async function getPublicProfile(username) {
  const user = await prisma.user.findUnique({ where: { username } });

  // Deliberately the same generic error for "doesn't exist" and
  // "deactivated" — same reasoning as login in auth.service.js: don't leak
  // account status to someone who isn't the account owner.
  if (!user || !user.isActive) {
    throw new AppError('USER_NOT_FOUND', 'Participant not found.', 404);
  }

  const rank = await getRank(user.id, user.handshakeCount, user.lastVerifiedHandshakeAt);
  return toPublicMinimalProfile(user, rank);
}

module.exports = { getPublicProfile };
