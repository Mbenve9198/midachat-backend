// src/server.js
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const authRoutes = require('./routes/auth');
const onboardingRoutes = require('./routes/onboarding');
const qrCodeRoutes = require('./routes/qrCode');
const twilioRoutes = require('./routes/twilio');
const app = express();

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-frontend-domain.vercel.app']  // Questo lo cambieremo dopo con il vero dominio
    : ['http://localhost:3001'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Aggiungi questa route di test
app.get('/', (req, res) => {
  res.json({ message: 'Backend server is running!' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/qrcode', qrCodeRoutes);
app.use('/api/twilio', twilioRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Qualcosa è andato storto!' });
});

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Verifichiamo che le variabili siano caricate
console.log('Loaded environment variables:', {
    mongodbUri: process.env.MONGODB_URI ? 'Present' : 'Missing',
    port: process.env.PORT,
    shortIoDomain: process.env.SHORT_IO_DOMAIN,
    shortIoApiKey: process.env.SHORT_IO_API_KEY ? 'Present' : 'Missing'
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server in ascolto sulla porta ${PORT}`);
  console.log(`📍 Webhook URL: /api/twilio/webhook`);
});

module.exports = app;