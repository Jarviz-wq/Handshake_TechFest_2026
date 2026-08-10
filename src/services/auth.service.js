const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../db/client');
const AppError = require('../utils/AppError');
const { JWT_SECRET, JWT_EXPIRY } = require('../config/constants');
const { getRank, toPublicProfile } = require('./user.service');

async function login(username, password) {
  const user = await prisma.user.findUnique({ where: { username } });

  console.log("--- DEBUG LOGIN ---");
  console.log("Input Username:", username);
  console.log("Prisma Found User:", user);

  if (!user) {
    await bcrypt.compare(password, '$2b$12$invalidsaltinvalidsaltinvalidsalte');
    throw new AppError('INVALID_CREDENTIALS', 'Incorrect username or password.', 401);
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    throw new AppError('INVALID_CREDENTIALS', 'Incorrect username or password.', 401);
  }

  if (!user.isActive) {
    throw new AppError('ACCOUNT_DEACTIVATED', 'This account has been deactivated.', 403);
  }

  const token = jwt.sign({ sub: user.id, isAdmin: user.isAdmin }, JWT_SECRET, {
    expiresIn: JWT_EXPIRY,
  });

  const rank = await getRank(user.id, user.handshakeCount, user.lastVerifiedHandshakeAt);

  return {
    token,
    user: toPublicProfile(user, rank),
  };
}

module.exports = { login };
