// src/models/Restaurant.js
const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: String,
    price: {
        type: Number,
        required: true
    },
    category: String,
    image_url: String,
    allergens: [String],
    ai_generated: {
        type: Boolean,
        default: false
    },
    ai_suggestions: [String]
});

const menuSectionSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    items: [menuItemSchema],
    style: {
        fonts: {
            primary: String,
            secondary: String
        },
        colors: {
            primary: String,
            secondary: String,
            accent: String,
            background: String
        },
        layout: {
            type: String,
            spacing: String
        }
    }
});

const restaurantSchema = new mongoose.Schema({
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    name: String,
    description: String,
    address: String,
    contact: {
        phone: String,
        website: String
    },
    google_data: {
        place_id: String,
        rating: Number,
        reviews_count: Number,
        maps_url: String,
        reviews_link: String,
        business_status: String,
        types: [String],
        price_level: Number,
        editorial_summary: String,
        business_description: String,
        photos: [{
            url: String,
            reference: String
        }],
        review_link: String
    },
    onboarding: {
        imported_from_google: Boolean,
        completed_steps: [Number],
        current_step: Number
    },
    menu: {
        url: String,
        shortUrl: String,
        file: String
    },
    reviews: {
        platform: {
            type: String,
            enum: ['google', 'tripadvisor'],
            default: 'google'
        },
        url: String,
        shortUrl: String
    },
    messages: {
        welcome: {
            it: String,
            en: String,
            es: String,
            fr: String,
            de: String
        },
        review: {
            it: String,
            en: String,
            es: String,
            fr: String,
            de: String
        }
    },
    qrCode: {
        whatsappUrl: String,
        design: String,
        theme: String,
        format: String,
        generatedAt: Date
    },
    whatsapp: {
        triggerName: String,
        qrGenerated: Boolean,
        generatedAt: Date
    },
    metrics: {
        qr_scans: {
            total: { type: Number, default: 0 },
            daily: [{ 
                date: Date,
                count: Number 
            }]
        },
        menu_clicks: {
            total: { type: Number, default: 0 },
            daily: [{ 
                date: Date,
                count: Number 
            }]
        },
        review_clicks: {
            total: { type: Number, default: 0 },
            daily: [{ 
                date: Date,
                count: Number 
            }]
        },
        current_reviews_count: { type: Number, default: 0 },
        last_reviews_update: Date
    }
}, {
    timestamps: true
});

// Indici per migliorare le performance delle query
restaurantSchema.index({ 'google_data.place_id': 1 });
restaurantSchema.index({ owner: 1 });
restaurantSchema.index({ 'google_data.rating': -1 });

// Metodo per aggiornare i dati da Google
restaurantSchema.methods.updateFromGoogle = async function(googleData) {
    this.name = googleData.name;
    this.address = googleData.formatted_address;
    this.contact.phone = googleData.formatted_phone_number;
    this.contact.website = googleData.website;
    
    this.google_data = {
        place_id: googleData.place_id,
        rating: googleData.rating,
        reviews_count: googleData.user_ratings_total,
        maps_url: googleData.url,
        reviews_link: googleData.reviews_link,
        business_status: googleData.business_status,
        types: googleData.types,
        price_level: googleData.price_level,
        photos: googleData.photos?.map(photo => ({
            url: photo.url,
            reference: photo.photo_reference
        })) || [],
        review_link: googleData.review_link
    };

    this.reviews = {
        platform: 'google',
        url: googleData.reviews_link
    };

    await this.save();
};

const Restaurant = mongoose.models.Restaurant || mongoose.model('Restaurant', restaurantSchema);

module.exports = Restaurant;