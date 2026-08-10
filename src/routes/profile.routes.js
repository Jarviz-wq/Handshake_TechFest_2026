const express = require('express');
const controller = require('../controllers/profile.controller');
const authenticate = require('../middleware/authenticate');
const validate = require('../middleware/validate');
const { usernameParamSchema } = require('../validators/profile.schema');

const router = express.Router();

router.get('/:username', authenticate, validate(usernameParamSchema, 'params'), controller.getPublicProfile);

module.exports = router;
