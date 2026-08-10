const adminImportService = require('../services/adminImport.service');
const { credentialsToCsv } = require('../utils/csv');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/apiResponse');
const AppError = require('../utils/AppError');

const importCsv = asyncHandler(async function importCsv(req, res) {
  if (!req.file) {
    throw new AppError('FILE_REQUIRED', 'A CSV file upload is required (field name: "file").', 400);
  }

  const csvText = req.file.buffer.toString('utf-8');
  const result = await adminImportService.importParticipants(csvText, req.user.id);

  sendSuccess(res, 200, 'Import complete.', result);
});

// Deliberately does NOT go through sendSuccess — this returns a CSV file
// download, not a JSON API response, so the consistent success/error
// envelope used everywhere else doesn't apply here by definition.
const exportCredentials = asyncHandler(async function exportCredentials(req, res) {
  const { batchId } = req.query;
  const credentials = await adminImportService.exportCredentials(batchId, req.user.id);

  const csv = credentialsToCsv(credentials);

  res
    .status(200)
    .set('Content-Type', 'text/csv; charset=utf-8')
    .set('Content-Disposition', 'attachment; filename="handshake-credentials.csv"')
    .send(csv);
});

module.exports = { importCsv, exportCredentials };
