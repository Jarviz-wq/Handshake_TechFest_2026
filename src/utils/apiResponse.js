// Every successful response in the API goes through this, so the shape
// can't drift between controllers written at different times. Errors have
// their own equivalent shape, produced in errorHandler.js — the two are
// kept in separate files because success and error responses are built at
// completely different points in the request lifecycle (a controller vs.
// an error-handling middleware), not because they're unrelated concepts.

function sendSuccess(res, statusCode, message, data = {}) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

module.exports = { sendSuccess };
