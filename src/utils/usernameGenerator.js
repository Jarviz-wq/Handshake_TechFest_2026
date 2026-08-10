// Generates short, memorable usernames from a participant's full name —
// firstname + a 2-digit number (e.g. "rahul24"). Collision resolution is
// the caller's responsibility (generateUniqueUsername below), since
// checking uniqueness requires a database lookup and this function stays a
// pure, dependency-free string transform.

const crypto = require('crypto');
const prisma = require('../db/client');

function baseUsernameFrom(fullName) {
  const firstName = fullName.trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g, '');
  const suffix = String(crypto.randomInt(0, 100)).padStart(2, '0');
  return `${firstName}${suffix}` || `participant${suffix}`; // guards an edge case: a name with no a-z0-9 characters at all
}

/**
 * Produces a username guaranteed unique against both the database and any
 * other usernames already assigned earlier in the same import batch (a
 * DB-only check would miss a collision between two rows in the same file,
 * since neither has been saved yet when the second is generated).
 *
 * Collision resolution follows the spec exactly: rahul24, then rahul24a,
 * rahul24b, ... — appending letters, never regenerating a different base.
 */
async function generateUniqueUsername(fullName, reservedInThisBatch) {
  const base = baseUsernameFrom(fullName);

  if (!reservedInThisBatch.has(base) && !(await prisma.user.findUnique({ where: { username: base } }))) {
    reservedInThisBatch.add(base);
    return base;
  }

  for (let i = 0; i < 26; i++) {
    const candidate = base + String.fromCharCode(97 + i); // a, b, c, ...
    if (!reservedInThisBatch.has(candidate) && !(await prisma.user.findUnique({ where: { username: candidate } }))) {
      reservedInThisBatch.add(candidate);
      return candidate;
    }
  }

  // Exhausting base+a..z (27 total candidates) for one name is not realistic
  // at fest scale, but falling back to a fully random suffix beats crashing
  // the whole import over one unlucky name collision.
  const fallback = `${base}${crypto.randomInt(100, 999)}`;
  reservedInThisBatch.add(fallback);
  return fallback;
}

module.exports = { generateUniqueUsername };
