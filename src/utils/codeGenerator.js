// Generates a random handshake code string. Deliberately not responsible
// for uniqueness — that's a database concern (see handshakeCode.service.js)
// — this function's only job is producing one random code correctly.

const crypto = require('crypto');
const { HANDSHAKE_CODE_LENGTH, HANDSHAKE_CODE_CHARSET } = require('../config/constants');

function generateRandomCode(length = HANDSHAKE_CODE_LENGTH) {
  let code = '';
  for (let i = 0; i < length; i++) {
    // crypto.randomInt, not Math.random() — the latter is not
    // cryptographically secure and must never back anything that
    // functions as an access credential, however short-lived.
    const index = crypto.randomInt(0, HANDSHAKE_CODE_CHARSET.length);
    code += HANDSHAKE_CODE_CHARSET[index];
  }
  return code;
}

module.exports = { generateRandomCode };
