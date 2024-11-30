const express = require('express');
const router = express.Router();
const Restaurant = require('../models/Restaurant');
const { fetchGooglePlaceDetails } = require('../services/google');

// Aggiorna i click
router.post('/track/:type/:restaurantId', async (req, res) => {
    const { type, restaurantId } = req.params;
    const today = new Date().setHours(0,0,0,0);

    try {
        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) return res.status(404).json({ error: 'Ristorante non trovato' });

        const metricPath = `metrics.${type}`;
        const dailyMetrics = restaurant.metrics[type].daily;
        
        // Aggiorna il conteggio giornaliero
        const todayIndex = dailyMetrics.findIndex(
            d => new Date(d.date).setHours(0,0,0,0) === today
        );

        if (todayIndex >= 0) {
            dailyMetrics[todayIndex].count += 1;
        } else {
            dailyMetrics.push({ date: new Date(), count: 1 });
        }

        // Aggiorna il totale
        restaurant.metrics[type].total += 1;
        
        await restaurant.save();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Aggiorna il conteggio delle recensioni
router.post('/update-reviews', async (req, res) => {
    try {
        const restaurants = await Restaurant.find({
            'onboarding.completed_steps': { $exists: true, $ne: [] }
        });

        for (const restaurant of restaurants) {
            const placeDetails = await fetchGooglePlaceDetails(restaurant.google_data.place_id);
            restaurant.metrics.current_reviews_count = placeDetails.user_ratings_total;
            restaurant.metrics.last_reviews_update = new Date();
            await restaurant.save();
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Endpoint per ottenere le metriche
router.get('/:restaurantId', async (req, res) => {
    try {
        const restaurant = await Restaurant.findById(req.params.restaurantId);
        if (!restaurant) return res.status(404).json({ error: 'Ristorante non trovato' });

        const metrics = {
            qr_scans: restaurant.metrics.qr_scans.total,
            menu_clicks: restaurant.metrics.menu_clicks.total,
            review_clicks: restaurant.metrics.review_clicks.total,
            current_reviews_count: restaurant.metrics.current_reviews_count,
            initial_reviews_count: restaurant.google_data.reviews_count,
            new_reviews: restaurant.metrics.current_reviews_count - restaurant.google_data.reviews_count
        };

        res.json({ metrics });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router; 