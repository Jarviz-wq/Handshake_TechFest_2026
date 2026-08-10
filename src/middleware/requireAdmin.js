// Must run AFTER `authenticate` in the route chain — depends on req.user
// already being populated. Admin login isn't a separate endpoint; the
// existing /api/auth/login already returns isAdmin in the JWT and profile
// (Module 2), so this middleware is the only new piece needed to gate
// admin-only routes.

const AppError = require('../utils/AppError');

function requireAdmin(req, res, next) {
  if (!req.user || !req.user.isAdmin) {
    return next(new AppError('FORBIDDEN', 'Admin access required.', 403));
  }
  next();
}

module.exports = requireAdmin;
