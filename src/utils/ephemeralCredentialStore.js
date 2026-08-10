// Holds plaintext credentials generated during a CSV import, ONLY long
// enough for an organizer to download them once. Never written to the
// database, never written to disk — a plain in-process Map.
//
// LIMITATION, worth knowing before this ships: this only works correctly
// on a single running instance. If this app is ever horizontally scaled to
// multiple replicas, an import handled by instance A and an export request
// that lands on instance B would find nothing — this would need to move to
// a shared store (Redis, or similar) at that point. For this project's
// actual deployment target (a single Railway/Render service), that's not a
// real constraint, but it stops being true the moment that changes.
//
// Same "ephemeral, single-use, auto-expiring" shape as the handshake code
// system itself (Module 3) — consistent with how this codebase treats any
// short-lived secret.

const TTL_MS = 15 * 60 * 1000; // 15 minutes

const store = new Map(); // batchId -> { credentials, expiresAt, timer }

function put(batchId, credentials) {
  const expiresAt = new Date(Date.now() + TTL_MS);
  const timer = setTimeout(() => store.delete(batchId), TTL_MS);
  timer.unref(); // never keep the process alive just for this
  store.set(batchId, { credentials, expiresAt, timer });
}

/**
 * Retrieves and immediately deletes a batch — a successful export consumes
 * it, matching "never store plaintext after export" as literally as
 * possible: the moment it's exported, it no longer exists anywhere.
 */
function takeOnce(batchId) {
  const entry = store.get(batchId);
  if (!entry) return null;

  clearTimeout(entry.timer);
  store.delete(batchId);
  return entry.credentials;
}

module.exports = { put, takeOnce };
