const express = require('express');
const { getRates, createRate, updateRate, deleteRate } = require('../controllers/rateController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', authenticate, getRates);
router.post('/', authenticate, createRate);
router.put('/:id', authenticate, updateRate);
router.delete('/:id', authenticate, deleteRate);

module.exports = router;
