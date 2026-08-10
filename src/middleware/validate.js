// Wraps a Zod schema as Express middleware. Validates and REPLACES
// req.body/query/params with the parsed result — not just checks it — so
// downstream code always works with Zod's coerced/defaulted output, never
// the raw untrusted input. This is the one place client input becomes
// "trusted" for the rest of the request lifecycle.

const AppError = require('../utils/AppError');

/**
 * @param {import('zod').ZodSchema} schema
 * @param {'body' | 'query' | 'params'} [source='body']
 */
function validate(schema, source = 'body') {
  return function validateMiddleware(req, res, next) {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const details = result.error.flatten().fieldErrors;
      return next(new AppError('VALIDATION_ERROR', 'Request validation failed', 400, details));
    }

    req[source] = result.data;
    next();
  };
}

module.exports = validate;
