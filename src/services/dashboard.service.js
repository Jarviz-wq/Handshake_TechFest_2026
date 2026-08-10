// Assembles everything the dashboard screen needs in one call. All four
// pieces are independent reads with no data dependency on each other, so
// they run concurrently via Promise.all rather than sequentially — four
// round trips in parallel, not four in series.

const prisma = require('../db/client');
const userService = require('./user.service');
const handshakeService = require('./handshake.service');

const RECENT_HANDSHAKES_LIMIT = 5;

async function getDashboard(user) {
  const [rank, recentHandshakes, totalParticipants, totalVerifiedHandshakes] = await Promise.all([
    userService.getRank(user.id, user.handshakeCount, user.lastVerifiedHandshakeAt),
    handshakeService.getHistory(user.id, RECENT_HANDSHAKES_LIMIT),
    prisma.user.count({ where: { isActive: true } }),
    prisma.handshake.count(),
  ]);

  return {
    profile: userService.toPublicMinimalProfile(user, rank),

    // No pending-request system exists in this architecture — Module 3
    // (Decision #4) removed the request/accept/reject flow entirely; a
    // handshake is only ever created already-verified. Kept as an empty
    // array rather than omitted, for frontend shape compatibility.
    pending_requests: [],

    recent_handshakes: recentHandshakes,
    total_participants: totalParticipants,
    total_verified_handshakes: totalVerifiedHandshakes,
  };
}

module.exports = { getDashboard };
