const OpenAI = require('openai');
const Restaurant = require('../models/Restaurant');
const User = require('../models/User');
const { searchPlace, getPlaceDetails } = require('../services/google/places');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const { createShortUrl } = require('../utils/urlShortener');
const axios = require('axios');
const placesService = require('../services/google/places');
const { generateWelcomeMessage, generateReviewMessage } = require('../services/ai/claude')

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Configura Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configura lo storage per multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'menus',
    allowed_formats: ['jpg', 'jpeg', 'png', 'pdf']
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
}).single('menuFile');

exports.searchRestaurant = async (req, res) => {
    try {
        const { name, address } = req.body;
        
        if (!name || !address) {
            return res.status(400).json({ 
                message: 'Nome e indirizzo sono richiesti' 
            });
        }

        const places = await searchPlace(name, address);
        res.json(places);
    } catch (error) {
        console.error('Search restaurant error:', error);
        res.status(500).json({ 
            message: 'Errore durante la ricerca del ristorante',
            error: error.message 
        });
    }
};

exports.importFromGoogle = async (req, res) => {
    try {
        const { placeId } = req.body;
        console.log('[Import] Starting import for placeId:', placeId);

        const placeDetails = await placesService.getPlaceDetails(placeId);
        console.log('[Import] Got place details');

        // Elimina sia per owner che per place_id
        await Restaurant.deleteMany({ 
            $or: [
                { owner: req.user.id },
                { 'google_data.place_id': placeId }
            ]
        });
        console.log('[Import] Deleted existing restaurants');

        const restaurant = await Restaurant.create({
            owner: req.user.id,
            name: placeDetails.name,
            description: placeDetails.editorial_summary?.overview || '',
            address: placeDetails.formatted_address,
            contact: {
                phone: placeDetails.formatted_phone_number,
                website: placeDetails.website
            },
            google_data: {
                place_id: placeId,
                rating: placeDetails.rating,
                reviews_count: placeDetails.user_ratings_total,
                types: placeDetails.types,
                photos: placeDetails.photos
            },
            reviews: {
                platform: 'google',
                url: placeDetails.reviews_link
            },
            onboarding: {
                imported_from_google: true,
                completed_steps: [1],
                current_step: 2
            }
        });
        console.log('[Import] Created new restaurant:', restaurant._id);

        res.json({ success: true });
    } catch (error) {
        console.error('[Import] Failed:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.getImportedData = async (req, res) => {
    try {
        const restaurant = await Restaurant.findOne({ owner: req.user.id });
        if (!restaurant) {
            return res.status(404).json({ error: 'Restaurant not found' });
        }

        res.json({
            name: restaurant.name,
            description: restaurant.description,
            address: restaurant.address,
            contact: restaurant.contact,
            google_data: restaurant.google_data,
            reviews: restaurant.reviews
        });
    } catch (error) {
        console.error('Error getting imported data:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.generateDescription = async (req, res) => {
    try {
        const { name, type, address, keywords } = req.body;
        
        const completion = await openai.chat.completions.create({
            model: "gpt-4-turbo-preview",  // Versione più recente di GPT-4
            messages: [
                {
                    role: "system",
                    content: "Sei un esperto di marketing per ristoranti. Il tuo compito è creare UNA SOLA frase accattivante che catturi l'essenza del locale."
                },
                {
                    role: "user",
                    content: `Genera UNA SOLA FRASE accattivante per questo ristorante:
                    Nome: ${name}
                    Tipo: ${type}
                    Indirizzo: ${address}
                    Parole chiave: ${keywords}
                    
                    REQUISITI OBBLIGATORI:
                    - UNA SOLA frase
                    - In italiano
                    - Massimo 15-20 parole
                    - Tono professionale ma accogliente
                    - NON menzionare l'indirizzo
                    - NON usare punti alla fine della frase
                    - Incorpora naturalmente le parole chiave fornite
                    `
                }
            ],
            temperature: 0.7,
            max_tokens: 60
        });

        const generatedDescription = completion.choices[0].message.content
            .trim()
            .replace(/\.$/, ''); // Rimuove il punto finale se presente

        res.json({ description: generatedDescription });
    } catch (error) {
        console.error('Generate description error:', error);
        res.status(500).json({ 
            message: 'Errore nella generazione della descrizione',
            error: error.message 
        });
    }
};

exports.updateMenu = async (req, res) => {
    try {
        const { menuUrl, restaurantName } = req.body;
        const userId = req.user.id;
        
        const restaurant = await Restaurant.findOne({ owner: userId });
        
        // Se c'è già uno shortUrl per il menu, non crearne uno nuovo
        if (restaurant.menu?.shortUrl) {
            // Aggiorna solo l'URL originale se è diverso
            if (restaurant.menu.url !== menuUrl) {
                await Restaurant.findOneAndUpdate(
                    { owner: userId },
                    { 
                        $set: {
                            'menu.url': menuUrl,
                            'onboarding.completed_steps': [...new Set([...restaurant.onboarding.completed_steps, 3])],
                            'onboarding.current_step': 4
                        }
                    }
                );
            }
        } else {
            // Crea un nuovo shortUrl solo se non esiste
            const shortMenuUrl = await createShortUrl(menuUrl, restaurantName, 'menu');
            
            await Restaurant.findOneAndUpdate(
                { owner: userId },
                { 
                    $set: {
                        'menu.url': menuUrl,
                        'menu.shortUrl': shortMenuUrl,
                        'onboarding.completed_steps': [...new Set([...restaurant.onboarding.completed_steps, 3])],
                        'onboarding.current_step': 4
                    }
                }
            );
        }

        res.json({ message: 'Menu aggiornato con successo' });
    } catch (error) {
        console.error('Update menu error:', error);
        res.status(500).json({ 
            message: 'Errore nell\'aggiornamento del menu',
            error: error.message 
        });
    }
};

// Funzione per recuperare i link esistenti
async function getExistingLinks(path) {
  try {
    const response = await axios.get(`https://api.short.io/api/links`, {
      headers: {
        'Authorization': process.env.SHORTIO_API_KEY,
        'Content-Type': 'application/json'
      },
      params: {
        domain: 'go.midachat.com',
        path: path
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error getting existing links:', error);
    return null;
  }
}

exports.updateReviews = async (req, res) => {
    try {
        const { platform, url } = req.body;
        const userId = req.user.id;
        
        // Cerca il ristorante
        const restaurant = await Restaurant.findOne({ owner: userId });
        if (!restaurant) {
            throw new Error('Ristorante non trovato');
        }
        
        if (!restaurant.name) {
            throw new Error('Nome del ristorante mancante');
        }

        // Crea short URL per le recensioni
        const shortReviewUrl = await createShortUrl(url, restaurant.name, 'review');

        const updatedRestaurant = await Restaurant.findOneAndUpdate(
            { owner: userId },
            { 
                $set: {
                    'reviews.platform': platform,
                    'reviews.url': url,
                    'reviews.shortUrl': shortReviewUrl,
                    'onboarding.completed_steps': [...new Set([...restaurant.onboarding.completed_steps, 4])],
                    'onboarding.current_step': 5
                }
            },
            { new: true }
        );

        res.json(updatedRestaurant);
    } catch (error) {
        console.error('Update reviews error:', error);
        res.status(500).json({ 
            message: 'Errore nell\'aggiornamento delle recensioni',
            error: error.message 
        });
    }
};

// Genera i messaggi di benvenuto
exports.generateWelcomeMessages = async (req, res) => {
    try {
        const userId = req.user.id
        const restaurant = await Restaurant.findOne({ userId })
        
        if (!restaurant) {
            return res.status(404).json({ error: 'Ristorante non trovato' })
        }

        const restaurantName = restaurant.name

        // Mappa corretta delle lingue
        const languageMap = {
            'it': 'italiano',
            'en': 'english',
            'de': 'deutsch',
            'fr': 'français',
            'es': 'español'
        }

        const messages = {}
        
        for (const [key, language] of Object.entries(languageMap)) {
            try {
                console.log(`Generating ${language} welcome message...`)
                messages[key] = await generateWelcomeMessage(language, restaurantName)
            } catch (error) {
                console.error(`Error generating ${language} message:`, error)
                throw new Error(`Errore nella generazione del messaggio in ${language}: ${error.message}`)
            }
        }

        res.json(messages)
    } catch (error) {
        console.error('Generate welcome messages error:', error)
        res.status(500).json({ error: error.message })
    }
}

// Salva i messaggi di benvenuto
exports.saveWelcomeMessages = async (req, res) => {
    try {
        const userId = req.user.id;
        const { messages } = req.body;

        const restaurant = await Restaurant.findOneAndUpdate(
            { owner: userId },
            { 
                $set: {
                    welcome_messages: messages,
                    'onboarding.completed_steps': [...new Set([...restaurant.onboarding.completed_steps, 5])],
                    'onboarding.current_step': 6
                }
            },
            { new: true }
        );

        if (!restaurant) {
            return res.status(404).json({ message: 'Ristorante non trovato' });
        }

        res.json(restaurant);
    } catch (error) {
        console.error('Save welcome messages error:', error);
        res.status(500).json({
            message: 'Errore nel salvataggio dei messaggi di benvenuto',
            error: error.message
        });
    }
};

exports.generateReviewMessages = async (req, res) => {
    try {
        const userId = req.user.id;
        
        const restaurant = await Restaurant.findOne({ owner: userId });
        if (!restaurant) {
            throw new Error('Ristorante non trovato');
        }

        const name = restaurant.name;
        const reviewUrl = restaurant.reviews?.shortUrl || restaurant.reviews?.url;
        const platform = restaurant.reviews?.platform || 'Google';

        const messages = {};
        const languages = {
            it: 'italiano',
            en: 'english',
            es: 'español',
            fr: 'français',
            de: 'deutsch'
        };

        for (const [code, language] of Object.entries(languages)) {
            try {
                console.log(`Generating ${language} review message...`);
                messages[code] = await generateReviewMessage(
                    name,
                    platform,
                    reviewUrl,
                    language
                );
                console.log(`Generated ${language} review message:`, messages[code]);
            } catch (error) {
                console.error(`Error generating ${language} review message:`, error);
                throw new Error(`Errore nella generazione del messaggio di recensione in ${language}: ${error.message}`);
            }
        }

        const update = {
            $set: {
                messages: {
                    ...restaurant.messages,
                    review: messages
                },
                'onboarding.completed_steps': [...new Set([...restaurant.onboarding.completed_steps, 6])],
                'onboarding.current_step': 7
            }
        };

        await Restaurant.findOneAndUpdate(
            { owner: userId },
            update,
            { new: true }
        );

        res.json(messages);
    } catch (error) {
        console.error('Generate review messages error:', error);
        res.status(500).json({
            message: 'Errore nella generazione dei messaggi di recensione',
            error: error.message
        });
    }
};

// Endpoint per salvare i messaggi modificati
exports.saveReviewMessages = async (req, res) => {
    try {
        const userId = req.user.id;
        const { messages } = req.body;

        if (!messages) {
            throw new Error('Messaggi non forniti');
        }

        await Restaurant.findOneAndUpdate(
            { owner: userId },
            { 
                $set: {
                    'messages.review': messages,
                    'onboarding.completed': true,
                    'onboarding.completed_steps': [...Array(7).keys()].map(i => i + 1)
                }
            }
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Save review messages error:', error);
        res.status(500).json({
            message: 'Errore nel salvataggio dei messaggi',
            error: error.message
        });
    }
}; 