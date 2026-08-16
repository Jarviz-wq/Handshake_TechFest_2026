const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../db/client');
const AppError = require('../utils/AppError');
const { JWT_SECRET, JWT_EXPIRY } = require('../config/constants');
const { toPublicProfile } = require('./user.service');

const DUMMY_HASH = '$2b$10$wN9aW691z1g35i0eZ5t6Eu5eT67PqQyGqK2s9zXh8V4wN9aW691z1';

async function login(username, password) {
  console.time('⚡ TOTAL LOGIN TIME');

  console.time('1. Database findUnique');
  const user = await prisma.user.findUnique({ where: { username } });
  console.timeEnd('1. Database findUnique');

  if (!user) {
    await bcrypt.compare(password, DUMMY_HASH);
    throw new AppError('INVALID_CREDENTIALS', 'Incorrect username or password.', 401);
  }

  // Check the bcrypt cost factor stored in database
  const costFactor = user.passwordHash?.split('$')[2];
  console.log(`🔑 Stored Password Cost Factor: ${costFactor} rounds`);

  console.time('2. Bcrypt compare');
  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  console.timeEnd('2. Bcrypt compare');

  if (!passwordMatches) {
    throw new AppError('INVALID_CREDENTIALS', 'Incorrect username or password.', 401);
  }

  if (!user.isActive) {
    throw new AppError('ACCOUNT_DEACTIVATED', 'This account has been deactivated.', 403);
  }

  console.time('3. JWT sign');
  const token = jwt.sign(
    { sub: user.id, isAdmin: user.isAdmin },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
  console.timeEnd('3. JWT sign');

  console.timeEnd('⚡ TOTAL LOGIN TIME');

  return {
    token,
    user: toPublicProfile(user, null),
  };
}

module.exports = { login };

