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
        console.log('📥 Webhook ricevuto:', req.body);
        
        const { Body: message, From: from } = req.body;
        const language = determineLanguage(from);
        
        console.log('📝 Messaggio:', message);
        console.log('📞 Da:', from);
        console.log('🌍 Lingua:', language);

        // Verifica se il messaggio inizia con "Ciao"
        if (!message.toLowerCase().startsWith('ciao')) {
            const errorMessages = {
                it: "⚠️ Per ricevere il menu e le informazioni sul WiFi, invia 'Ciao' seguito dal nome del ristorante.",
                en: "⚠️ To receive the menu and WiFi information, please send 'Hello' followed by the restaurant name."
            };

            await client.messages.create({
                to: from,
                body: errorMessages[language],
                from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`
            });

            return res.status(200).send();
        }

        // Estrai il nome del trigger
        const triggerName = message.slice(5).trim();
        console.log('🔍 Ricerca ristorante con trigger:', triggerName);

        // Cerca il ristorante
        const restaurant = await Restaurant.findOne({ 
            'whatsapp.triggerName': triggerName
        });

        if (!restaurant) {
            const notFoundMessages = {
                it: "⚠️ Ristorante non trovato. Verifica il nome o scannerizza nuovamente il QR code.",
                en: "⚠️ Restaurant not found. Please verify the name or scan the QR code again."
            };

            await client.messages.create({
                to: from,
                body: notFoundMessages[language],
                from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`
            });

            return res.status(200).send();
        }

        // Invia il messaggio di benvenuto
        await client.messages.create({
            to: from,
            body: restaurant.messages.welcome[language],
            from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`
        });

        // Calcola l'ora di invio (2 ore dopo)
        const now = new Date();
        const twoHoursLater = new Date(now.getTime() + (2 * 60 * 60 * 1000));
        
        // Converti in UTC per Twilio
        const sendTimeUTC = new Date(twoHoursLater.toISOString());

        console.log('⏰ Debug orari:', {
            oraAttuale: now.toLocaleString('it-IT', { timeZone: 'Europe/Rome' }),
            oraInvioLocale: twoHoursLater.toLocaleString('it-IT', { timeZone: 'Europe/Rome' }),
            oraInvioUTC: sendTimeUTC.toISOString()
        });

        // Controlla se l'orario è fuori dalla fascia consentita (00:00-08:00 ora italiana)
        const hourInItaly = twoHoursLater.getHours();
        if (hourInItaly >= 0 && hourInItaly < 8) {
            // Sposta alle 10:00 del giorno successivo
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(10, 0, 0, 0);
            sendTimeUTC = new Date(tomorrow.toISOString());
            
            console.log('⚠️ Orario fuori fascia, spostato a:', 
                tomorrow.toLocaleString('it-IT', { timeZone: 'Europe/Rome' })
            );
        }

        const scheduledMessage = await client.messages.create({
            messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
            to: from,
            body: restaurant.messages.review[language],
            from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
            scheduleType: 'fixed',
            sendAt: sendTimeUTC.toISOString()
        });

        console.log('✅ Messaggio schedulato:', {
            messageId: scheduledMessage.sid,
            status: scheduledMessage.status,
            oraSchedulataLocale: new Date(sendTimeUTC).toLocaleString('it-IT', { timeZone: 'Europe/Rome' }),
            oraSchedulataUTC: sendTimeUTC.toISOString()
        });

        // Verifica lo stato del messaggio schedulato
        const scheduledMessageStatus = await client.messages(scheduledMessage.sid).fetch();
        console.log('📊 Stato dettagliato schedulazione:', {
            sid: scheduledMessageStatus.sid,
            status: scheduledMessageStatus.status,
            direction: scheduledMessageStatus.direction,
            scheduledTime: scheduledMessageStatus.dateSent || scheduledMessageStatus.dateCreated,
            error: scheduledMessageStatus.errorMessage
        });

        res.status(200).send();
    } catch (error) {
        console.error('❌ Errore:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}; 