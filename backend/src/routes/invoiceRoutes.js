const express = require('express');
const {
  getNextInvoiceNumber,
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  duplicateInvoice,
  updatePaymentStatus,
  addPayment,
  deletePayment,
  getInvoicePayments
} = require('../controllers/invoiceController');
const { authenticate } = require('../middleware/authMiddleware');

const { downloadInvoicePDF } = require('../controllers/pdfController');

const router = express.Router();

router.get('/next-number', authenticate, getNextInvoiceNumber);
router.get('/', authenticate, getInvoices);
router.get('/:id/pdf', authenticate, downloadInvoicePDF);
router.get('/:id/payments', authenticate, getInvoicePayments);
router.get('/:id', authenticate, getInvoiceById);
router.post('/', authenticate, createInvoice);
router.post('/:id/payments', authenticate, addPayment);
router.delete('/:id/payments/:paymentId', authenticate, deletePayment);
router.put('/:id', authenticate, updateInvoice);
router.delete('/:id', authenticate, deleteInvoice);
router.post('/:id/duplicate', authenticate, duplicateInvoice);
router.patch('/:id/payment', authenticate, updatePaymentStatus);

module.exports = router;
