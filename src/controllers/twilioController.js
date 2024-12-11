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

// Funzione per determinare la lingua dal prefisso
function determinaLingua(numero) {
    const numeroPulito = numero.replace('whatsapp:', '');
    if (numeroPulito.startsWith('+39')) return 'it';
    if (numeroPulito.startsWith('+34')) return 'es';
    if (numeroPulito.startsWith('+44')) return 'en';
    if (numeroPulito.startsWith('+49')) return 'de';
    if (numeroPulito.startsWith('+33')) return 'fr';
    return 'en'; // Default a inglese se il prefisso non è riconosciuto
}

// Funzione per schedulare la recensione
async function scheduleReviewRequest(restaurant, numeroCliente, nomeCliente) {
    try {
        const lingua = determinaLingua(numeroCliente);
        console.log('🌍 Lingua rilevata per recensione:', lingua);

        const tempoAttesaRecensione = restaurant.reviewDelay || 2;
        const waitTimeMs = tempoAttesaRecensione * 60 * 60 * 1000;
        
        const now = new Date();
        const sendAt = new Date(now.getTime() + waitTimeMs);

        console.log('⏰ Scheduling recensione:', {
            lingua: lingua,
            tempoAttesa: `${tempoAttesaRecensione} ore`,
            oraAttuale: now.toISOString(),
            oraInvioPrevista: sendAt.toISOString()
        });

        let reviewMessage = restaurant.messages.review[lingua] || restaurant.messages.review['en'];
        reviewMessage = reviewMessage
            .replace('{{firstName}}', nomeCliente)
            .replace('{{restaurantName}}', restaurant.name)
            .replace('{{reviewLink}}', restaurant.reviewLink || '#');

        const messageOptions = {
            body: reviewMessage,
            to: numeroCliente,
            from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
            messagingServiceSid: 'MGe724ee97ad6fa6edab5f9b68c635b5f7',
            scheduleType: 'fixed',
            sendAt: sendAt.toISOString()
        };

        console.log('📝 Tentativo di scheduling con opzioni:', JSON.stringify(messageOptions, null, 2));

        const message = await client.messages.create(messageOptions);
        console.log(`✅ Messaggio di recensione schedulato con successo:`, {
            sid: message.sid,
            scheduledTime: sendAt.toISOString()
        });
        
        return message.sid;
    } catch (error) {
        console.error('❌ Errore nello scheduling della recensione:', error);
        throw error;
    }
}

exports.handleIncomingMessage = async (req, res) => {
    try {
        console.log('🔥 WEBHOOK WHATSAPP RICEVUTO');
        console.log('Body completo:', req.body);
        
        const { Body: message, From: from, ProfileName: profileName } = req.body;
        const firstName = profileName || 'Cliente';
        const lingua = determineLanguage(from);
        
        console.log('📩 Messaggio ricevuto:', {
            testo: message,
            da: from,
            nome: firstName,
            lingua: lingua,
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
            // Usa il messaggio di errore nella lingua corretta
            const errorMessages = {
                it: "⚠️ Ristorante non trovato. Verifica il nome o scannerizza nuovamente il QR code.",
                es: "⚠️ Restaurante no encontrado. Verifica el nombre o escanea nuevamente el código QR.",
                en: "⚠️ Restaurant not found. Please verify the name or scan the QR code again.",
                de: "⚠️ Restaurant nicht gefunden. Überprüfen Sie den Namen oder scannen Sie den QR-Code erneut.",
                fr: "⚠️ Restaurant non trouvé. Veuillez vérifier le nom ou scanner à nouveau le code QR."
            };

            await client.messages.create({
                to: from,
                body: errorMessages[lingua] || errorMessages.en,
                from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`
            });

            return res.status(200).send('OK');
        }

        // Invia il messaggio di benvenuto nella lingua corretta
        let welcomeMessage = restaurant.messages.welcome[lingua] || restaurant.messages.welcome['en'];
        welcomeMessage = welcomeMessage
            .replace('{{firstName}}', firstName)
            .replace('{{restaurantName}}', restaurant.name)
            .replace('{{menuUrl}}', restaurant.menuUrl)
            .replace('{{wifiInfo}}', restaurant.wifi?.password || 'Non disponibile');

        await client.messages.create({
            to: from,
            body: welcomeMessage,
            from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`
        });

        // Schedula il messaggio di recensione
        try {
            await scheduleReviewRequest(restaurant, from, firstName);
        } catch (error) {
            console.error('⚠️ Errore nello scheduling della recensione:', error);
            // Continuiamo l'esecuzione anche se lo scheduling fallisce
        }

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