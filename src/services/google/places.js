// src/services/google/places.js
const { Client } = require('@googlemaps/google-maps-services-js');

const client = new Client({});

exports.searchPlace = async (name, address) => {
    try {
        // Combina nome e indirizzo per una ricerca più precisa
        const query = `${name} ${address}`;
        
        const response = await client.textSearch({
            params: {
                query,
                type: 'restaurant',  // Limita ai soli ristoranti
                key: process.env.GOOGLE_PLACES_API_KEY,
                fields: [
                    'place_id',
                    'name',
                    'formatted_address',
                    'rating',
                    'user_ratings_total',
                    'business_status'
                ]
            }
        });

        // Filtra i risultati per matchare meglio
        const filteredResults = response.data.results
            .filter(place => {
                // Verifica che il nome del ristorante sia simile a quello cercato
                const placeName = place.name.toLowerCase();
                const searchName = name.toLowerCase();
                return placeName.includes(searchName) || searchName.includes(placeName);
            })
            .slice(0, 3); // Limita a massimo 3 risultati

        return filteredResults.map(place => ({
            place_id: place.place_id,
            name: place.name,
            address: place.formatted_address,
            rating: place.rating,
            reviews_count: place.user_ratings_total,
            business_status: place.business_status
        }));

    } catch (error) {
        throw new Error(`Places search failed: ${error.message}`);
    }
};

exports.getPlaceDetails = async (placeId) => {
    try {
        const response = await client.placeDetails({
            params: {
                place_id: placeId,
                fields: [
                    'name',
                    'formatted_address',
                    'formatted_phone_number',
                    'rating',
                    'user_ratings_total',
                    'price_level',
                    'website',
                    'photos',
                    'url',
                    'editorial_summary',
                    'business_status',
                    'types'
                ],
                key: process.env.GOOGLE_PLACES_API_KEY
            }
        });

        const result = response.data.result;
        result.review_link = `https://search.google.com/local/writereview?placeid=${placeId}`;

        console.log('Full Place Details Response:', JSON.stringify(response.data, null, 2));
        return result;
    } catch (error) {
        console.error('Error fetching place details:', error);
        throw error;
    }
};