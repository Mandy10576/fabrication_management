const express = require('express');
const {
  getNextInvoiceNumber,
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  duplicateInvoice,
  updatePaymentStatus
} = require('../controllers/invoiceController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/next-number', authenticate, getNextInvoiceNumber);
router.get('/', authenticate, getInvoices);
router.get('/:id', authenticate, getInvoiceById);
router.post('/', authenticate, createInvoice);
router.put('/:id', authenticate, updateInvoice);
router.delete('/:id', authenticate, deleteInvoice);
router.post('/:id/duplicate', authenticate, duplicateInvoice);
router.patch('/:id/payment', authenticate, updatePaymentStatus);

module.exports = router;
