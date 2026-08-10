const { z } = require('zod');

// One row of the parsed CSV, after header normalization (csv.js) but
// before anything is trusted. `department` and `year` are optional since
// not every form export collects them.
const csvRowSchema = z.object({
  fullName: z.string().trim().min(1, 'Full name is required'),
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  college: z.string().trim().min(1, 'College is required'),
  department: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined)),
  year: z.coerce.number().int().positive().optional().catch(undefined),
});

const participantQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(100).optional(),
  college: z.string().trim().max(100).optional(),
  minHandshakes: z.coerce.number().int().min(0).optional(),
  maxHandshakes: z.coerce.number().int().min(0).optional(),
});

const usernameParamSchema = z.object({
  username: z.string().trim().min(1).max(50),
});

const exportQuerySchema = z.object({
  batchId: z.string().uuid('Invalid batch id'),
});

module.exports = {
  csvRowSchema,
  participantQuerySchema,
  usernameParamSchema,
  exportQuerySchema,
};
