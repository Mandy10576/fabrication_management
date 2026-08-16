const express = require('express');
const multer = require('multer');
const {
  getProperties,
  getAllProperties,
  createProperty,
  getPropertyById,
  updateProperty,
  deleteProperty,
  createRoom,
  getRoomById,
  updateRoom,
  deleteRoom
} = require('../controllers/rentPropertyController');
const { getTenants, createTenant, updateTenant, uploadTenantDocuments, deleteTenantDocument } = require('../controllers/rentTenantController');
const { startContract, updateContract, endContract, getRentCollection, getRentOverview } = require('../controllers/rentContractController');
const {
  generateBills,
  getBills,
  getBillById,
  addBillPayment,
  updateBillPayment,
  deleteBillPayment,
  addCombinedPayment
} = require('../controllers/rentBillController');
const {
  addElectricityBill,
  updateElectricityBill,
  markElectricityBillPaid,
  addElectricityPayment,
  updateElectricityPayment,
  deleteElectricityPayment,
  deleteElectricityBill,
  getElectricityBills
} = require('../controllers/rentElectricityController');
const { getRentDashboardStats } = require('../controllers/rentDashboardController');
const { authenticate } = require('../middleware/authMiddleware');

// Files are held in memory just long enough to stream to Supabase Storage —
// nothing is written to local disk.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

const router = express.Router();

// Dashboard
router.get('/dashboard', authenticate, getRentDashboardStats);

// Rent Collection (cross-property)
router.get('/collection', authenticate, getRentCollection);

// Unified Rent Dashboard overview — one row per occupied room, rent + electricity combined
router.get('/overview', authenticate, getRentOverview);

// Properties filter dropdown (flat list)
router.get('/properties/all', authenticate, getAllProperties);

// Bills (cross-property list first — must precede /bills/:id)
router.get('/bills', authenticate, getBills);
router.post('/bills/generate', authenticate, generateBills);
router.get('/bills/:id', authenticate, getBillById);
router.post('/bills/:id/payments', authenticate, addBillPayment);
router.put('/bills/:id/payments/:paymentId', authenticate, updateBillPayment);
router.delete('/bills/:id/payments/:paymentId', authenticate, deleteBillPayment);

// Electricity (cross-property list first — must precede /electricity/:id)
router.get('/electricity', authenticate, getElectricityBills);
router.patch('/electricity/:id', authenticate, updateElectricityBill);
router.patch('/electricity/:id/pay', authenticate, markElectricityBillPaid);
router.post('/electricity/:id/payments', authenticate, addElectricityPayment);
router.put('/electricity/:id/payments/:paymentId', authenticate, updateElectricityPayment);
router.delete('/electricity/:id/payments/:paymentId', authenticate, deleteElectricityPayment);
router.delete('/electricity/:id', authenticate, deleteElectricityBill);

// Tenants
router.get('/tenants', authenticate, getTenants);
router.post('/tenants', authenticate, createTenant);
router.put('/tenants/:id', authenticate, updateTenant);
router.post('/tenants/:id/documents', authenticate, upload.array('documents', 5), uploadTenantDocuments);
router.delete('/tenants/:id/documents/:documentId', authenticate, deleteTenantDocument);

// Contracts
router.put('/contracts/:id', authenticate, updateContract);
router.patch('/contracts/:id/end', authenticate, endContract);
router.post('/contracts/:id/combined-payments', authenticate, addCombinedPayment);

// Properties
router.get('/properties', authenticate, getProperties);
router.post('/properties', authenticate, createProperty);
router.get('/properties/:id', authenticate, getPropertyById);
router.put('/properties/:id', authenticate, updateProperty);
router.delete('/properties/:id', authenticate, deleteProperty);

// Rooms (created under a property)
router.post('/properties/:propertyId/rooms', authenticate, createRoom);
router.post('/rooms/:roomId/contracts', authenticate, startContract);
router.post('/rooms/:roomId/electricity', authenticate, addElectricityBill);
router.get('/rooms/:id', authenticate, getRoomById);
router.put('/rooms/:id', authenticate, updateRoom);
router.delete('/rooms/:id', authenticate, deleteRoom);

module.exports = router;
