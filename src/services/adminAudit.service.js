// Reuses the `admin_actions` table already in the schema since Module 1 —
// Module 5 needs no new table for this, just more action types flowing
// through the same one. Same "never let logging break the feature it
// observes" philosophy as auditLog.service.js from Module 3.

const prisma = require('../db/client');
const logger = require('../utils/logger');

async function logAdminAction({ adminId, action, targetUserId = null, metadata = null }) {
  try {
    await prisma.adminAction.create({
      data: { adminId, action, targetUserId, metadata },
    });
  } catch (err) {
    logger.error({ err, action }, 'Failed to write admin action audit log');
  }
}

module.exports = { logAdminAction };
