const { z } = require('zod');

const usernameParamSchema = z.object({
  username: z.string().trim().min(1).max(50),
});

module.exports = { usernameParamSchema };
