const express = require('express');
const multer = require('multer');
const {
  getAreas,
  getAreaById,
  createArea,
  updateArea,
  deleteArea,
  createBuilding,
  getAllBuildings,
  getBuildingById,
  updateBuilding,
  deleteBuilding,
  createRoom,
  getRoomById,
  updateRoom,
  deleteRoom
} = require('../controllers/rentPropertyController');
const {
  getTenants,
  updateTenant,
  uploadTenantDocuments,
  deleteTenantDocument,
  startTenancy,
  endTenancy,
  addRentPayment,
  updateRentPayment,
  deleteRentPayment,
  addCombinedPayment,
  getRentCollection,
  getRentOverview
} = require('../controllers/rentTenancyController');
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

// Rent Collection (cross-building)
router.get('/collection', authenticate, getRentCollection);

// Unified Rent Dashboard overview — one row per occupied room, rent + electricity combined
router.get('/overview', authenticate, getRentOverview);

// Buildings filter dropdown (flat list, optionally scoped to an area)
router.get('/buildings', authenticate, getAllBuildings);

// Electricity (cross-building list first — must precede /electricity/:id)
router.get('/electricity', authenticate, getElectricityBills);
router.patch('/electricity/:id', authenticate, updateElectricityBill);
router.patch('/electricity/:id/pay', authenticate, markElectricityBillPaid);
router.post('/electricity/:id/payments', authenticate, addElectricityPayment);
router.put('/electricity/:id/payments/:paymentId', authenticate, updateElectricityPayment);
router.delete('/electricity/:id/payments/:paymentId', authenticate, deleteElectricityPayment);
router.delete('/electricity/:id', authenticate, deleteElectricityBill);

// Tenants
router.get('/tenants', authenticate, getTenants);
router.put('/tenants/:id', authenticate, updateTenant);
router.post('/tenants/:id/documents', authenticate, upload.array('documents', 5), uploadTenantDocuments);
router.delete('/tenants/:id/documents/:documentId', authenticate, deleteTenantDocument);

// Tenancies
router.patch('/tenancies/:id/end', authenticate, endTenancy);
router.post('/tenancies/:id/payments', authenticate, addRentPayment);
router.put('/tenancies/:id/payments/:paymentId', authenticate, updateRentPayment);
router.delete('/tenancies/:id/payments/:paymentId', authenticate, deleteRentPayment);
router.post('/tenancies/:id/combined-payments', authenticate, addCombinedPayment);

// Areas
router.get('/areas', authenticate, getAreas);
router.post('/areas', authenticate, createArea);
router.get('/areas/:id', authenticate, getAreaById);
router.put('/areas/:id', authenticate, updateArea);
router.delete('/areas/:id', authenticate, deleteArea);

// Buildings (created under an area)
router.post('/areas/:areaId/buildings', authenticate, createBuilding);
router.get('/buildings/:id', authenticate, getBuildingById);
router.put('/buildings/:id', authenticate, updateBuilding);
router.delete('/buildings/:id', authenticate, deleteBuilding);

// Rooms (created under a building)
router.post('/buildings/:buildingId/rooms', authenticate, createRoom);
router.post('/rooms/:roomId/tenancies', authenticate, startTenancy);
router.post('/rooms/:roomId/electricity', authenticate, addElectricityBill);
router.get('/rooms/:id', authenticate, getRoomById);
router.put('/rooms/:id', authenticate, updateRoom);
router.delete('/rooms/:id', authenticate, deleteRoom);

module.exports = router;
