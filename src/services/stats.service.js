// All five figures are independent aggregates over the same tables — no
// query depends on another's result, so they run concurrently.
//
// Distinguishing this from the future admin `/admin/stats` (Module 5,
// per the architecture doc): this endpoint returns only aggregate counts,
// nothing per-user, so it's safe for any authenticated participant, not
// just admins. `/admin/stats` will likely return a superset intended for
// organizer eyes only — the two are deliberately separate endpoints, not
// the same data gated by role.

const prisma = require('../db/client');

async function getStats() {
  const now = new Date();

  const [totalParticipants, totalVerifiedHandshakes, activeHandshakeCodes, collegeGroups, avgResult] =
    await Promise.all([
      prisma.user.count({ where: { isActive: true } }),
      prisma.handshake.count(),
      prisma.handshakeCode.count({ where: { usedAt: null, expiresAt: { gt: now } } }),
      prisma.user.groupBy({ by: ['college'], where: { isActive: true } }),
      prisma.user.aggregate({ where: { isActive: true }, _avg: { handshakeCount: true } }),
    ]);

  return {
    total_participants: totalParticipants,
    total_verified_handshakes: totalVerifiedHandshakes,
    active_handshake_codes: activeHandshakeCodes,
    total_colleges: collegeGroups.length,
    average_handshakes_per_participant: Math.round((avgResult._avg.handshakeCount ?? 0) * 100) / 100,
  };
}

module.exports = { getStats };
