// src/middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        console.log('Auth Header:', authHeader);
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.log('Token non fornito o formato non valido');
            return res.status(401).json({ message: 'Token non fornito' });
        }

        const token = authHeader.split(' ')[1];
        console.log('Token estratto:', token.substring(0, 20) + '...'); // Log parziale per sicurezza
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('Token decodificato:', decoded);
        
        const user = await User.findById(decoded.userId);
        console.log('User trovato:', user ? user._id : 'nessun utente');

        if (!user) {
            console.log('Utente non trovato nel database');
            return res.status(401).json({ message: 'Utente non trovato' });
        }

        req.user = {
            id: user._id,
            email: user.email,
            name: user.name
        };
        console.log('User object aggiunto alla request:', req.user);
        
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(401).json({ message: 'Non autorizzato' });
    }
};

module.exports = authMiddleware;