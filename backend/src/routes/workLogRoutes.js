const express = require('express');
const { getOrgWorkLogs } = require('../controllers/workLogController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', authenticate, getOrgWorkLogs);

module.exports = router;
