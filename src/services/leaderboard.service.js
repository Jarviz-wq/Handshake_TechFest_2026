// The leaderboard's rank column must come from the exact same algorithm as
// getRank() in user.service.js (handshakeCount DESC, lastVerifiedHandshakeAt
// ASC, ties sharing a rank) — a user should never see a different rank
// number on the leaderboard than on their own dashboard.
//
// Computing that per-row by calling getRank() once per result would be an
// N+1 query (one COUNT per leaderboard row) and would violate this
// module's own "avoid N+1" requirement. Postgres's RANK() window function
// computes the identical thing — "1 + count of rows that sort strictly
// ahead of this one" — for every row in a single pass, which is exactly
// what a raw query lets us express and Prisma's query builder can't.

const { Prisma } = require('@prisma/client');
const prisma = require('../db/client');

async function getLeaderboard(page, limit) {
  const skip = (page - 1) * limit;

  const [entries, total] = await Promise.all([
    prisma.$queryRaw(Prisma.sql`
      SELECT
        username,
        "fullName" AS full_name,
        college,
        "handshakeCount" AS handshake_count,
        RANK() OVER (
          ORDER BY "handshakeCount" DESC, "lastVerifiedHandshakeAt" ASC NULLS LAST
        )::int AS rank
      FROM "users"
      WHERE "isActive" = true
      ORDER BY "handshakeCount" DESC, "lastVerifiedHandshakeAt" ASC NULLS LAST
      LIMIT ${limit} OFFSET ${skip}
    `),
    prisma.user.count({ where: { isActive: true } }),
  ]);

  return {
    entries,
    pagination: {
      page,
      limit,
      total,
      total_pages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

module.exports = { getLeaderboard };
