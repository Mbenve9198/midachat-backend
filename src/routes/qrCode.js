const express = require('express');
const router = express.Router();
const qrCodeController = require('../controllers/qrCodeController');
const authMiddleware = require('../middleware/auth');

router.post('/whatsapp-link', authMiddleware, qrCodeController.generateWhatsappLink);

module.exports = router; 