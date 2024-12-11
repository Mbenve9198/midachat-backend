const twilio = require('twilio');
const Restaurant = require('../models/Restaurant');

const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

const COUNTRY_PREFIXES = {
    '39': 'it',
    '44': 'en',
    '1': 'en',
    '49': 'de',
    '33': 'fr',
    '34': 'es'
};

const determineLanguage = (phoneNumber) => {
    const cleanNumber = phoneNumber.replace('whatsapp:', '');
    const number = cleanNumber.startsWith('+') ? cleanNumber.slice(1) : cleanNumber;
    
    console.log('🔍 Numero pulito per lingua:', number);
    
    const prefix = Object.keys(COUNTRY_PREFIXES)
        .find(prefix => number.startsWith(prefix));
    
    console.log('🌍 Prefisso trovato:', prefix);
    console.log('🗣️ Lingua selezionata:', COUNTRY_PREFIXES[prefix] || 'en');
    
    return COUNTRY_PREFIXES[prefix] || 'en';
};

exports.handleIncomingMessage = async (req, res) => {
    try {
        console.log('🔥 WEBHOOK WHATSAPP RICEVUTO');
        console.log('Body completo:', req.body);
        
        const { Body: message, From: from, ProfileName: profileName } = req.body;
        const firstName = profileName || 'Cliente';  // Usiamo il ProfileName o "Cliente" come fallback
        
        console.log('📩 Messaggio ricevuto:', {
            testo: message,
            da: from,
            nome: firstName,
            timestamp: new Date().toISOString()
        });

        // Verifica se il messaggio inizia con "Ciao" o "Hello"
        if (!message.toLowerCase().startsWith('ciao') && !message.toLowerCase().startsWith('hello')) {
            const errorMessage = "⚠️ Per ricevere il menu e le informazioni sul WiFi, invia 'Ciao' o 'Hello' seguito dal nome del ristorante.";

            await client.messages.create({
                to: from,
                body: errorMessage,
                from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`
            });

            return res.status(200).send('OK');
        }

        // Estrai il nome del trigger (rimuovi "Ciao" o "Hello")
        const triggerName = message.toLowerCase().startsWith('ciao') ? 
            message.slice(5).trim() : 
            message.slice(6).trim();

        console.log('🔍 Ricerca ristorante con trigger:', triggerName);

        // Cerca il ristorante
        const restaurant = await Restaurant.findOne({ 
            'whatsapp.triggerName': triggerName
        });

        if (!restaurant) {
            const notFoundMessage = "⚠️ Ristorante non trovato. Verifica il nome o scannerizza nuovamente il QR code.";
            await client.messages.create({
                to: from,
                body: notFoundMessage,
                from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`
            });

            return res.status(200).send('OK');
        }

        // Sostituisci i campi dinamici nel messaggio di benvenuto
        let welcomeMessage = restaurant.messages.welcome['it']; // Per ora usiamo italiano
        welcomeMessage = welcomeMessage
            .replace('{{firstName}}', firstName)
            .replace('{{restaurantName}}', restaurant.name)
            .replace('{{menuUrl}}', restaurant.menuUrl)
            .replace('{{wifiInfo}}', restaurant.wifi?.password || 'Non disponibile');

        // Invia il messaggio di benvenuto
        await client.messages.create({
            to: from,
            body: welcomeMessage,
            from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`
        });

        res.status(200).send('OK');
    } catch (error) {
        console.error('❌ Errore nel webhook:', error);
        console.error('Stack trace:', error.stack);
        res.status(200).send('OK');
    }
};

exports.testWhatsApp = async (req, res) => {
    try {
        const testMessage = await client.messages.create({
            body: 'Test message from webhook',
            from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
            to: 'whatsapp:+1234567890' // Sostituisci con il tuo numero
        });
        
        res.json({
            success: true,
            messageId: testMessage.sid,
            status: testMessage.status
        });
    } catch (error) {
        console.error('Test message error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}; 