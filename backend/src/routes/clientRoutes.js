const express = require('express');
const { getClients, getClientById, createClient, updateClient, deleteClient, checkDuplicateClient } = require('../controllers/clientController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', authenticate, getClients);
// Must precede '/:id', otherwise Express reads "check-duplicate" as an id.
router.get('/check-duplicate', authenticate, checkDuplicateClient);
router.get('/:id', authenticate, getClientById);
router.post('/', authenticate, createClient);
router.put('/:id', authenticate, updateClient);
router.delete('/:id', authenticate, deleteClient);

module.exports = router;
