// Writes to handshake_logs. Two things matter about how this is used, not
// just what it does — see the callers in handshakeCode.service.js and
// handshake.service.js:
//
// 1. Success events are logged using the SAME transaction client (`tx`) as
//    the operation they describe, so the log entry only persists if the
//    operation actually commits.
// 2. Failure events are logged using the plain, non-transactional `prisma`
//    client, called AFTER the failing transaction has already rolled back —
//    logging them inside the transaction that's about to abort would
//    silently discard the very audit entry meant to record the failure.
//
// Either way, a logging failure must never break the feature it's
// observing — caught and reported through the app logger, never thrown.

const prisma = require('../db/client');
const logger = require('../utils/logger');

const EVENTS = {
  CODE_GENERATED: 'CODE_GENERATED',
  CODE_VERIFIED: 'CODE_VERIFIED',
  CODE_EXPIRED: 'CODE_EXPIRED',
  INVALID_CODE: 'INVALID_CODE',
  DUPLICATE_HANDSHAKE: 'DUPLICATE_HANDSHAKE',
  VERIFICATION_FAILED: 'VERIFICATION_FAILED',
};

/**
 * @param {object} entry
 * @param {string} entry.event - one of EVENTS
 * @param {string} entry.userId
 * @param {string|null} [entry.targetUserId]
 * @param {string|null} [entry.handshakeCode]
 * @param {string|null} [entry.ipAddress]
 * @param {import('@prisma/client').Prisma.TransactionClient} [client] - pass
 *   the active `tx` for success events; omit (defaults to the plain client)
 *   for failure events logged after a rollback.
 */
async function logEvent(entry, client = prisma) {
  try {
    await client.handshakeLog.create({
      data: {
        event: entry.event,
        userId: entry.userId,
        targetUserId: entry.targetUserId ?? null,
        handshakeCode: entry.handshakeCode ?? null,
        ipAddress: entry.ipAddress ?? null,
      },
    });
  } catch (err) {
    logger.error({ err, event: entry.event }, 'Failed to write audit log entry');
  }
}

module.exports = { logEvent, EVENTS };
