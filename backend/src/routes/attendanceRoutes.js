const express = require('express');
const { getOrgAttendance } = require('../controllers/attendanceController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', authenticate, getOrgAttendance);

module.exports = router;
