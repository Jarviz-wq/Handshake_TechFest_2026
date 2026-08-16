const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../db/client');
const AppError = require('../utils/AppError');
const { JWT_SECRET, JWT_EXPIRY } = require('../config/constants');
const { toPublicProfile } = require('./user.service');

// Fast constant-time comparison fallback (cost 10)
const DUMMY_HASH = '$2b$10$wN9aW691z1g35i0eZ5t6Eu5eT67PqQyGqK2s9zXh8V4wN9aW691z1';

async function login(username, password) {
  const user = await prisma.user.findUnique({ where: { username } });

  if (!user) {
    await bcrypt.compare(password, DUMMY_HASH);
    throw new AppError('INVALID_CREDENTIALS', 'Incorrect username or password.', 401);
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    throw new AppError('INVALID_CREDENTIALS', 'Incorrect username or password.', 401);
  }

  if (!user.isActive) {
    throw new AppError('ACCOUNT_DEACTIVATED', 'This account has been deactivated.', 403);
  }

  const token = jwt.sign(
    { sub: user.id, isAdmin: user.isAdmin },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );

  // Return immediately without blocking on secondary rank calculations
  return {
    token,
    user: toPublicProfile(user, null),
  };
}

module.exports = { login };
