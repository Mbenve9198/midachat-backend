const { createShortUrl } = require('./urlShortener');

async function generateWhatsappLink(restaurantName) {
    try {
        // Numero di telefono WhatsApp
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

        return shortUrl;
    } catch (error) {
        console.error('Error generating WhatsApp link:', error);
        throw error;
    }
}

module.exports = { generateWhatsappLink }; 