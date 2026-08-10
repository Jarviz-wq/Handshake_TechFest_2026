// Aggregate figures for the organizer-facing dashboard — distinct from the
// participant-facing /api/dashboard (Module 4) and the general /api/stats
// (also Module 4, safe for any participant). This one is admin-only and
// includes figures no participant should see broken out (top colleges,
// today's activity).

const prisma = require('../db/client');

const TOP_N = 5;

function startOfTodayUtc() {
  const now = new Date();
  // UTC day boundary, not the event's local timezone — there's no
  // configured event timezone anywhere in this system yet. Worth revisiting
  // if "today" needs to align with the actual fest's local day rather than
  // UTC's, but that's a product decision, not something to guess at here.
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

async function getOrganizerDashboard() {
  const todayStart = startOfTodayUtc();

  const [
    totalParticipants,
    activeUsers,
    verifiedHandshakes,
    generatedCodes,
    todaysHandshakes,
    topCollegeGroups,
    topParticipants,
  ] = await Promise.all([
    prisma.user.count({ where: { isAdmin: false } }),
    prisma.user.count({ where: { isAdmin: false, isActive: true } }),
    prisma.handshake.count(),
    prisma.handshakeCode.count(),
    prisma.handshake.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.user.groupBy({
      by: ['college'],
      where: { isAdmin: false, isActive: true },
      _count: { college: true },
      orderBy: { _count: { college: 'desc' } },
      take: TOP_N,
    }),
    prisma.user.findMany({
      where: { isAdmin: false, isActive: true },
      orderBy: [{ handshakeCount: 'desc' }, { lastVerifiedHandshakeAt: 'asc' }],
      take: TOP_N,
      select: { username: true, fullName: true, college: true, handshakeCount: true },
    }),
  ]);

  return {
    total_participants: totalParticipants,
    active_users: activeUsers,
    verified_handshakes: verifiedHandshakes,
    generated_codes: generatedCodes,
    todays_handshakes: todaysHandshakes,
    top_colleges: topCollegeGroups.map((g, i) => ({
      rank: i + 1,
      college: g.college,
      participant_count: g._count.college,
    })),
    // Simple 1..5 positional rank for this small top-N summary widget — not
    // the tie-aware RANK() used by the real /api/leaderboard. A tie inside
    // a top-5 admin snapshot isn't worth a second window-function query;
    // the actual leaderboard endpoint remains the authoritative rank source.
    top_participants: topParticipants.map((u, i) => ({
      rank: i + 1,
      username: u.username,
      full_name: u.fullName,
      college: u.college,
      handshake_count: u.handshakeCount,
    })),
  };
}

module.exports = { getOrganizerDashboard };
