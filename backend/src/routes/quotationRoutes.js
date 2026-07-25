const express = require('express');
const {
  getQuotations,
  getQuotationById,
  createQuotation,
  convertToInvoice,
  deleteQuotation
} = require('../controllers/quotationController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', authenticate, getQuotations);
router.get('/:id', authenticate, getQuotationById);
router.post('/', authenticate, createQuotation);
router.post('/:id/convert', authenticate, convertToInvoice);
router.delete('/:id', authenticate, deleteQuotation);

module.exports = router;
