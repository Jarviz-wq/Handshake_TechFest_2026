const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const env = require('../config/env');
const logger = require('../utils/logger');

const isProduction = env.NODE_ENV === 'production';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
  log: isProduction
    ? [
        { emit: 'event', level: 'warn' },
        { emit: 'event', level: 'error' },
      ]
    : [
        { emit: 'event', level: 'warn' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'query' },
      ],
});

prisma.$on('warn', (e) => logger.warn({ prisma: e }, 'Prisma warning'));
prisma.$on('error', (e) => logger.error({ prisma: e }, 'Prisma error'));

if (!isProduction) {
  prisma.$on('query', (e) =>
    logger.debug(
      { query: e.query, params: e.params, duration: e.duration },
      'Prisma query'
    )
  );
}

module.exports = prisma;
