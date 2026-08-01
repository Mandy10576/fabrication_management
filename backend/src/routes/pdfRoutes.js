const express = require('express');
const { downloadInvoicePDF, downloadQuotationPDF, renderCustomPDF } = require('../controllers/pdfController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/invoice/:id', authenticate, downloadInvoicePDF);
router.get('/quotation/:id', authenticate, downloadQuotationPDF);
router.post('/render', authenticate, renderCustomPDF);

module.exports = router;
