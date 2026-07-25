const express = require('express');
const { getFinancialYears, createFinancialYear, setCurrentFinancialYear } = require('../controllers/financialYearController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', authenticate, getFinancialYears);
router.post('/', authenticate, createFinancialYear);
router.put('/:id/set-current', authenticate, setCurrentFinancialYear);

module.exports = router;
