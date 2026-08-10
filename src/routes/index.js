const express = require('express');
const authRoutes = require('./auth.routes');
const handshakeRoutes = require('./handshake.routes');
const dashboardRoutes = require('./dashboard.routes');
const leaderboardRoutes = require('./leaderboard.routes');
const profileRoutes = require('./profile.routes');
const statsRoutes = require('./stats.routes');
const adminRoutes = require('./admin.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/handshakes', handshakeRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/leaderboard', leaderboardRoutes);
router.use('/profile', profileRoutes);
router.use('/stats', statsRoutes);
router.use('/admin', adminRoutes);

module.exports = router;
