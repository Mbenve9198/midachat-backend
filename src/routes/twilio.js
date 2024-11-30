const express = require('express');
const router = express.Router();
const twilioController = require('../controllers/twilioController');

// Endpoint di test
router.get('/test', (req, res) => {
    console.log('Test endpoint chiamato');
    res.json({ status: 'WhatsApp webhook endpoint is active' });
});

// Webhook per WhatsApp
router.post('/webhook', 
    express.urlencoded({ extended: false }), 
    twilioController.handleIncomingMessage
);

module.exports = router; 