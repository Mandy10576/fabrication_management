const express = require('express');
const multer = require('multer');
const { getCompany, updateCompany, uploadLogo } = require('../controllers/companyController');
const { authenticate } = require('../middleware/authMiddleware');

// Files are held in memory just long enough to stream to Supabase Storage —
// nothing is written to local disk.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

const router = express.Router();

router.get('/', authenticate, getCompany);
router.put('/', authenticate, updateCompany);
router.post('/logo', authenticate, upload.single('logo'), uploadLogo);

module.exports = router;
