const Restaurant = require('../models/Restaurant');

exports.getMyRestaurant = async (req, res) => {
    try {
        // Prendi l'id dell'utente dal token JWT
        const userId = req.user._id;  // In Mongoose è _id invece di id

        // Trova il ristorante associato all'utente
        const restaurant = await Restaurant.findOne({ owner: userId });

        if (!restaurant) {
            return res.status(404).json({ 
                message: 'Ristorante non trovato' 
            });
        }

        // Restituisci i dati del ristorante
        res.json({
            id: restaurant._id,
            name: restaurant.name,
            description: restaurant.description,
            address: restaurant.address,
            contact: restaurant.contact,
            onboarding: restaurant.onboarding,
            menu: {
                url: restaurant.menu?.url,
                shortUrl: restaurant.menu?.shortUrl
            },
            reviews: restaurant.reviews,
            google_data: restaurant.google_data
        });

    } catch (error) {
        console.error('Get restaurant error:', error);
        res.status(500).json({ 
            message: 'Errore nel recupero dei dati del ristorante',
            error: error.message 
        });
    }
}; 