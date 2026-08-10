// express-rate-limit instance scoped to login. Deliberately not a generic
// "apply to everything" limiter — different endpoints will need different
// limits later (verify-code needs a much tighter per-user limit in Module
// 3), so each gets its own configured instance rather than one shared
// global limiter with a one-size-fits-none threshold.

const rateLimit = require('express-rate-limit');
const AppError = require('../utils/AppError');
const {
  LOGIN_RATE_LIMIT_WINDOW_MINUTES,
  LOGIN_RATE_LIMIT_MAX_ATTEMPTS,
  VERIFY_CODE_RATE_LIMIT_WINDOW_MINUTES,
  VERIFY_CODE_RATE_LIMIT_MAX_ATTEMPTS,
} = require('../config/constants');

const loginRateLimit = rateLimit({
  windowMs: LOGIN_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
  max: LOGIN_RATE_LIMIT_MAX_ATTEMPTS,
  standardHeaders: true,
  legacyHeaders: false,
  // Routes through the same centralized error shape as everything else,
  // rather than express-rate-limit's default plain-text response.
  handler: (req, res, next) => {
    next(
      new AppError(
        'TOO_MANY_ATTEMPTS',
        `Too many login attempts. Please try again in ${LOGIN_RATE_LIMIT_WINDOW_MINUTES} minutes.`,
        429
      )
    );
  },
});

// Keyed per-user (req.user.id), not per-IP — must run after `authenticate`
// in the route chain, since it depends on req.user existing. Per-IP would
// be the wrong shape here: a fest venue's shared/NAT'd WiFi could put many
// legitimate participants behind one IP, and per-IP limiting would either
// be too loose to matter or would collectively lock them all out together.
const verifyCodeRateLimit = rateLimit({
  windowMs: VERIFY_CODE_RATE_LIMIT_WINDOW_MINUTES * 60 * 1000,
  max: VERIFY_CODE_RATE_LIMIT_MAX_ATTEMPTS,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user.id,
  handler: (req, res, next) => {
    next(
      new AppError(
        'TOO_MANY_ATTEMPTS',
        'Too many code attempts. Please wait a moment before trying again.',
        429
      )
    );
  },
});

module.exports = { loginRateLimit, verifyCodeRateLimit };
