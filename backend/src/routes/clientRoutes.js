const express = require('express');
const { getClients, getClientById, createClient, updateClient, deleteClient } = require('../controllers/clientController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', authenticate, getClients);
router.get('/:id', authenticate, getClientById);
router.post('/', authenticate, createClient);
router.put('/:id', authenticate, updateClient);
router.delete('/:id', authenticate, deleteClient);

module.exports = router;
