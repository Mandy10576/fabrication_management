const express = require('express');
const { runDailyRentReminderCheck } = require('../controllers/rentReminderController');
const { authenticateCronOrAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

// GET so Vercel Cron (which sends plain GET requests) can hit it directly;
// POST kept too for manual triggering from tools that prefer it.
router.get('/rent-reminders', authenticateCronOrAdmin, runDailyRentReminderCheck);
router.post('/rent-reminders', authenticateCronOrAdmin, runDailyRentReminderCheck);

module.exports = router;
