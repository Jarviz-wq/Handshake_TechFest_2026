// Wraps an async Express handler so a rejected promise is forwarded to
// next(err) automatically. Without this, every controller needs its own
// try/catch that manually calls next(err) — easy to forget once, and one
// forgotten catch means an unhandled rejection that never reaches
// errorHandler.js at all.

function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
