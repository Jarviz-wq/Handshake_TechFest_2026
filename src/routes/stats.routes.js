const express = require('express');
const controller = require('../controllers/stats.controller');
const authenticate = require('../middleware/authenticate');

const router = express.Router();

router.get('/', authenticate, controller.getStats);

module.exports = router;
