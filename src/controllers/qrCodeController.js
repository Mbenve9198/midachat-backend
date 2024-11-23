const { createShortUrl } = require('../utils/urlShortener');
const Restaurant = require('../models/Restaurant');

const generateWhatsappLink = async (req, res) => {
    try {
        const { restaurantName } = req.body;
        
        // Numero WhatsApp fisso
        const phoneNumber = '393516541218';
        // Messaggio precompilato
        const message = encodeURIComponent(`Ciao ${restaurantName}`);
        // URL WhatsApp
        const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;
        
        // Crea short URL
        const shortUrl = await createShortUrl(
            whatsappUrl, 
            restaurantName,
            'whatsapp'
        );

        // Salva il trigger nel database
        await Restaurant.findOneAndUpdate(
            { owner: req.user.id },
            { 
                'whatsapp.triggerName': restaurantName,
                'whatsapp.qrGenerated': true,
                'whatsapp.generatedAt': new Date()
            }
        );

        res.json({ shortUrl });
    } catch (error) {
        console.error('Generate WhatsApp link error:', error);
        res.status(500).json({
            message: 'Errore nella generazione del link WhatsApp',
            error: error.message
        });
    }
};

module.exports = {
    generateWhatsappLink
}; 