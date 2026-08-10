// Represents a known, expected error condition — a bad login, an expired
// code, a validation failure — as opposed to a genuine bug (a null
// dereference, a DB connection drop). The distinction matters in
// errorHandler.js: AppErrors are safe to describe to the client in detail,
// anything else gets a generic message so we never leak internals.

class AppError extends Error {
  /**
   * @param {string} code - machine-readable identifier, e.g. "CODE_EXPIRED".
   *   Matches the error code table in the architecture doc — the frontend
   *   branches on this, not on the message string.
   * @param {string} message - human-readable, safe to show to the end user.
   * @param {number} statusCode - HTTP status to respond with.
   * @param {object} [details] - optional structured detail, e.g. per-field
   *   validation errors. Only ever populated with data already safe to
   *   return to the client — never internal state.
   */
  constructor(code, message, statusCode, details) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true; // distinguishes from programmer errors/bugs
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
