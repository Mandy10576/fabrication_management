const express = require('express');
const {
  getNextQuotationNumber,
  getQuotations,
  getQuotationById,
  createQuotation,
  updateQuotation,
  convertToInvoice,
  deleteQuotation
} = require('../controllers/quotationController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/next-number', authenticate, getNextQuotationNumber);
router.get('/', authenticate, getQuotations);
router.get('/:id', authenticate, getQuotationById);
router.post('/', authenticate, createQuotation);
router.put('/:id', authenticate, updateQuotation);
router.post('/:id/convert', authenticate, convertToInvoice);
router.delete('/:id', authenticate, deleteQuotation);

module.exports = router;
