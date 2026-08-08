const express = require('express');
const { getOrgSalary } = require('../controllers/salaryController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', authenticate, getOrgSalary);

module.exports = router;
