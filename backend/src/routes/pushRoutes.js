const express = require('express');
const { getPublicKey, subscribe, unsubscribe, sendTestNotification } = require('../controllers/pushController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/vapid-public-key', authenticate, getPublicKey);
router.post('/subscribe', authenticate, subscribe);
router.post('/unsubscribe', authenticate, unsubscribe);
router.post('/test', authenticate, sendTestNotification);

module.exports = router;
