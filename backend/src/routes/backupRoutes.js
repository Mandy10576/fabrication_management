const express = require('express');
const { exportBackup, restoreBackup } = require('../controllers/backupController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/export', authenticate, exportBackup);
router.post('/restore', authenticate, restoreBackup);

module.exports = router;
