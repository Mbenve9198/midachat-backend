const express = require('express');
const router = express.Router();
const twilioController = require('../controllers/twilioController');

// Webhook per i messaggi in arrivo da Twilio
router.post('/webhook', 
    express.urlencoded({ extended: false }), // Twilio invia i dati come form-urlencoded
    // twilioAuthMiddleware,  // Commenta questa linea
    twilioController.handleIncomingMessage
);

module.exports = router; 