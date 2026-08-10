const express = require('express');
const controller = require('../controllers/leaderboard.controller');
const authenticate = require('../middleware/authenticate');
const validate = require('../middleware/validate');
const { leaderboardQuerySchema } = require('../validators/leaderboard.schema');

const router = express.Router();

router.get('/', authenticate, validate(leaderboardQuerySchema, 'query'), controller.getLeaderboard);

module.exports = router;
