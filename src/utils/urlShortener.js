const axios = require('axios');

const shortIoApi = axios.create({
    baseURL: 'https://api.short.io/links',
    headers: {
        'Authorization': process.env.SHORT_IO_API_KEY || 'sk_SC1kmO5P8z8V50mM',
        'Content-Type': 'application/json'
    }
});

async function createShortUrl(originalUrl, restaurantName, type = 'menu') {
    try {
        const formattedName = restaurantName
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');

        const slug = `${formattedName}-${type}`;
        
        const requestData = {
            originalURL: originalUrl,
            domain: 'go.midachat.com',
            path: slug
        };

        const response = await axios.post('https://api.short.io/links', requestData, {
            headers: {
                'Authorization': 'sk_SC1kmO5P8z8V50mM',
                'Content-Type': 'application/json'
            }
        });

        return response.data.shortURL;

    } catch (error) {
        console.error('Error details:', {
            message: error.message,
            response: error.response?.data,
            request: error.config?.data
        });
        throw new Error(`Errore nella creazione dello short URL: ${error.message}`);
    }
}

module.exports = { createShortUrl }; 