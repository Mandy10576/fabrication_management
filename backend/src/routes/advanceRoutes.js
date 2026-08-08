const express = require('express');
const { getOrgAdvances } = require('../controllers/advanceController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', authenticate, getOrgAdvances);

module.exports = router;
