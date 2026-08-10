// Participant listing, search/filter, activation, and password reset.
// Deliberately excludes admin accounts from every query here (`isAdmin:
// false`) — this module manages participants, not other organizers.

const bcrypt = require('bcrypt');
const prisma = require('../db/client');
const AppError = require('../utils/AppError');
const { generateSecurePassword } = require('../utils/passwordGenerator');
const { BCRYPT_ROUNDS } = require('../config/constants');
const { logAdminAction } = require('./adminAudit.service');

// Explicit allowlist, and enforced at the query level via `select` (not
// fetched-then-omitted) — passwordHash and id are never even pulled from
// the database for this view, let alone returned.
const ADMIN_PARTICIPANT_SELECT = {
  username: true,
  fullName: true,
  email: true,
  college: true,
  department: true,
  year: true,
  handshakeCount: true,
  isActive: true,
  createdAt: true,
};

function toAdminParticipantView(user) {
  return {
    username: user.username,
    full_name: user.fullName,
    email: user.email,
    college: user.college,
    department: user.department,
    year: user.year,
    handshake_count: user.handshakeCount,
    is_active: user.isActive,
    created_at: user.createdAt,
  };
}

async function listParticipants({ page = 1, limit = 10, q, college, minHandshakes, maxHandshakes } = {}) {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, parseInt(limit, 10) || 10);
  const skip = (pageNum - 1) * limitNum;

  const where = { isAdmin: false };

  if (q) {
    where.OR = [
      { fullName: { contains: q, mode: 'insensitive' } },
      { username: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
    ];
  }
  if (college) {
    where.college = { equals: college, mode: 'insensitive' };
  }
  if (minHandshakes !== undefined || maxHandshakes !== undefined) {
    where.handshakeCount = {};
    if (minHandshakes !== undefined) where.handshakeCount.gte = Number(minHandshakes);
    if (maxHandshakes !== undefined) where.handshakeCount.lte = Number(maxHandshakes);
  }

  const [rows, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limitNum,
      select: ADMIN_PARTICIPANT_SELECT,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    participants: rows.map(toAdminParticipantView),
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      total_pages: Math.max(1, Math.ceil(total / limitNum)),
    },
  };
}

async function findParticipantOrThrow(username) {
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || user.isAdmin) {
    throw new AppError('PARTICIPANT_NOT_FOUND', 'Participant not found.', 404);
  }
  return user;
}

async function setParticipantActive(username, isActive, adminId) {
  const user = await findParticipantOrThrow(username);

  const updated = await prisma.user.update({
    where: { username },
    data: { isActive },
    select: ADMIN_PARTICIPANT_SELECT,
  });

  await logAdminAction({
    adminId,
    action: isActive ? 'reactivate' : 'deactivate',
    targetUserId: user.id, // internal audit trail only — never returned via the API
  });

  return toAdminParticipantView(updated);
}

async function resetParticipantPassword(username, adminId) {
  const user = await findParticipantOrThrow(username);

  const newPassword = generateSecurePassword();
  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  await prisma.user.update({ where: { username }, data: { passwordHash } });

  await logAdminAction({ adminId, action: 'reset_password', targetUserId: user.id });

  // Plaintext returned exactly once, in this response, then gone — same
  // never-stored guarantee as the import flow's generated passwords.
  return { username, new_password: newPassword };
}

module.exports = { listParticipants, setParticipantActive, resetParticipantPassword };
