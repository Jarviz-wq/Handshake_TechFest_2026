const { z } = require('zod');
const { HANDSHAKE_CODE_CHARSET } = require('../config/constants');

// Built from the same charset constant used to generate codes, so the two
// can never silently drift apart (e.g. someone updating the charset in
// constants.js without remembering this regex exists).
const codePattern = new RegExp(`^[${HANDSHAKE_CODE_CHARSET}]{6,8}$`);

const verifyCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(codePattern, 'Invalid handshake code format.'),
});

const historyQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

module.exports = { verifyCodeSchema, historyQuerySchema };
