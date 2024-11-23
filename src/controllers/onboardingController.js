const OpenAI = require('openai');
const Restaurant = require('../models/restaurant');
const User = require('../models/User');
const { searchPlace, getPlaceDetails } = require('../services/google/places');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const { createShortUrl } = require('../utils/urlShortener');
const axios = require('axios');
const placesService = require('../services/google/places');

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
        const placeDetails = await placesService.getPlaceDetails(placeId);
        
        // Prima elimina il ristorante esistente
        await Restaurant.deleteOne({ owner: req.user.id });

        // Usa findOneAndUpdate come prima
        const restaurant = await Restaurant.findOneAndUpdate(
            { owner: req.user.id },
            {
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
                    url: placeDetails.review_link
                },
                onboarding: {
                    imported_from_google: true,
                    completed_steps: [1],
                    current_step: 2
                }
            },
            { 
                new: true,
                upsert: true 
            }
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Import error:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.getImportedData = async (req, res) => {
    try {
        const userId = req.user.id;
        console.log('Getting imported data for user:', userId);

        const restaurant = await Restaurant.findOne({ 
            owner: userId,
            'onboarding.imported_from_google': true 
        }).sort({ updatedAt: -1 });

        if (!restaurant) {
            console.log('No imported restaurant found for user:', userId);
            return res.status(404).json({ message: 'Nessun ristorante importato trovato' });
        }

        console.log('Found restaurant:', restaurant);
        res.json({
            name: restaurant.name,
            description: restaurant.description,
            address: restaurant.address,
            menuUrl: restaurant.menuUrl || '',
            contact: restaurant.contact || {},
            google_data: restaurant.google_data || {},
            reviews: restaurant.reviews
        });

    } catch (error) {
        console.error('Error getting imported data:', error);
        res.status(500).json({ 
            message: 'Errore nel recupero dei dati importati',
            error: error.message 
        });
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
        const userId = req.user.id;
        
        const restaurant = await Restaurant.findOne({ owner: userId });
        if (!restaurant) {
            throw new Error('Ristorante non trovato');
        }

        // Verifica messaggi esistenti
        const hasValidMessages = restaurant.messages?.welcome && 
            Object.keys(restaurant.messages.welcome).length === 5 &&
            Object.values(restaurant.messages.welcome).every(msg => msg && msg.trim() !== '');

        if (hasValidMessages) {
            return res.json(restaurant.messages.welcome);
        }

        // Estrai i dati necessari dal ristorante
        const name = restaurant.name;
        const type = restaurant.type || 'ristorante';
        const menuUrl = restaurant.menu?.shortUrl || restaurant.menu?.url;
        const description = restaurant.description || '';

        const messages = {};
        const languages = {
            it: 'italiano',
            en: 'english',
            es: 'español',
            fr: 'français',
            de: 'deutsch'
        };

        // Genera i messaggi per ogni lingua
        for (const [code, language] of Object.entries(languages)) {
            try {
                console.log(`Generating ${language} message...`);
                const completion = await openai.chat.completions.create({
                    model: "gpt-4-turbo-preview",
                    messages: [
                        {
                            role: "system",
                            content: `Sei un esperto di marketing per ristoranti. Devi generare un messaggio di benvenuto WhatsApp in ${language}. 
                            Il messaggio deve essere professionale ma amichevole.`
                        },
                        {
                            role: "user",
                            content: `Crea un messaggio di benvenuto per:
                            Nome: ${name}
                            Tipo: ${type}
                            Descrizione: ${description}
                            Link menu: ${menuUrl}
                            
                            REQUISITI OBBLIGATORI:
                            - In ${language}
                            - Massimo 4-5 righe
                            - Tono accogliente e professionale
                            - DEVE includere il link al menu
                            - Usa emoji appropriate ma non eccessive
                            - NON tradurre il nome del ristorante
                            - Il link al menu deve essere su una riga separata`
                        }
                    ],
                    temperature: 0.7,
                    max_tokens: 300
                });

                messages[code] = completion.choices[0].message.content.trim();
                console.log(`Generated ${language} message:`, messages[code]);
            } catch (error) {
                console.error(`Error generating ${language} message:`, error);
                throw new Error(`Errore nella generazione del messaggio in ${language}: ${error.message}`);
            }
        }

        // Salva i messaggi generati
        const update = {
            $set: {
                messages: {
                    ...restaurant.messages,
                    welcome: messages
                },
                'onboarding.completed_steps': [...new Set([...restaurant.onboarding.completed_steps, 5])],
                'onboarding.current_step': 6
            }
        };

        const updatedRestaurant = await Restaurant.findOneAndUpdate(
            { owner: userId },
            update,
            { new: true }
        );

        res.json(messages);
    } catch (error) {
        console.error('Generate welcome messages error:', error);
        res.status(500).json({
            message: 'Errore nella generazione dei messaggi di benvenuto',
            error: error.message
        });
    }
};

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

        // Verifica messaggi esistenti
        const hasValidMessages = restaurant.messages?.review && 
            Object.keys(restaurant.messages.review).length === 5 &&
            Object.values(restaurant.messages.review).every(msg => msg && msg.trim() !== '');

        if (hasValidMessages) {
            return res.json(restaurant.messages.review);
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
                const completion = await openai.chat.completions.create({
                    model: "gpt-4-turbo-preview",
                    messages: [
                        {
                            role: "system",
                            content: `Sei un esperto di marketing per ristoranti. Devi generare un messaggio in ${language} 
                            per chiedere una recensione su ${platform}. Il messaggio deve essere molto cordiale e personale, 
                            ma anche professionale.`
                        },
                        {
                            role: "user",
                            content: `Crea un messaggio per chiedere una recensione per:
                            Nome: ${name}
                            Piattaforma: ${platform}
                            Link recensioni: ${reviewUrl}
                            
                            REQUISITI OBBLIGATORI:
                            - In ${language}
                            - Massimo 3-4 righe
                            - Tono molto cordiale e personale
                            - DEVE includere il link recensioni
                            - Usa emoji appropriate ma non eccessive
                            - NON tradurre il nome del ristorante
                            - Il link deve essere su una riga separata
                            - Menziona che il loro feedback è importante`
                        }
                    ],
                    temperature: 0.7,
                    max_tokens: 300
                });

                messages[code] = completion.choices[0].message.content.trim();
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

        const updatedRestaurant = await Restaurant.findOneAndUpdate(
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