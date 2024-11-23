const twilio = require('twilio');

const twilioAuthMiddleware = (req, res, next) => {
    // In sviluppo, bypass l'autenticazione
    if (process.env.NODE_ENV === 'development') {
        return next();
    }

    const twilioSignature = req.headers['x-twilio-signature'];
    const url = process.env.BASE_URL + req.originalUrl;
    const params = req.body;

    const isValid = twilio.validateRequest(
        process.env.TWILIO_AUTH_TOKEN,
        twilioSignature,
        url,
        params
    );

    if (isValid) {
        next();
    } else {
        res.status(403).send('Forbidden');
    }
};

module.exports = twilioAuthMiddleware; 