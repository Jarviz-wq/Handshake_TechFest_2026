const express = require('express');
const authController = require('../controllers/auth.controller');
const authenticate = require('../middleware/authenticate');
const validate = require('../middleware/validate');
const { loginSchema } = require('../validators/auth.schema');
const { loginRateLimit } = require('../middleware/rateLimit');

const router = express.Router();

router.post('/login', loginRateLimit, validate(loginSchema), authController.login);
router.get('/me', authenticate, authController.me);

module.exports = router;
