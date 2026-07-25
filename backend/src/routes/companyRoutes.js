const express = require('express');
const multer = require('multer');
const path = require('path');
const { getCompany, updateCompany, uploadLogo } = require('../controllers/companyController');
const { authenticate } = require('../middleware/authMiddleware');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../public/uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `logo_${Date.now()}${ext}`);
  }
});
const upload = multer({ storage });

const router = express.Router();

router.get('/', authenticate, getCompany);
router.put('/', authenticate, updateCompany);
router.post('/logo', authenticate, upload.single('logo'), uploadLogo);

module.exports = router;
