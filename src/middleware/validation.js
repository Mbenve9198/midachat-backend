// src/middleware/validation.js
const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
};

exports.validateRegistration = (req, res, next) => {
    const { name, email, password } = req.body;
    const errors = [];

    if (!name || name.trim().length < 2) {
        errors.push('Il nome deve essere di almeno 2 caratteri');
    }

    if (!email || !validateEmail(email)) {
        errors.push('Email non valida');
    }

    if (!password || password.length < 6) {
        errors.push('La password deve essere di almeno 6 caratteri');
    }

    if (errors.length > 0) {
        return res.status(400).json({ errors });
    }

    next();
};

exports.validateLogin = (req, res, next) => {
    const { email, password } = req.body;
    const errors = [];

    if (!email || !validateEmail(email)) {
        errors.push('Email non valida');
    }

    if (!password) {
        errors.push('Password richiesta');
    }

    if (errors.length > 0) {
        return res.status(400).json({ errors });
    }

    next();
};