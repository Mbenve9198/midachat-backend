const request = require('supertest');
const app = require('../server');

describe('Twilio Webhook', () => {
    it('should handle incoming message correctly', async () => {
        const response = await request(app)
            .post('/api/twilio/webhook')
            .send({
                Body: 'Ciao La Cucina Italiana',
                From: '+393331234567'
            });

        expect(response.status).toBe(200);
    });

    it('should handle unknown restaurant', async () => {
        const response = await request(app)
            .post('/api/twilio/webhook')
            .send({
                Body: 'Ciao Ristorante Inesistente',
                From: '+393331234567'
            });

        expect(response.status).toBe(200);
    });
}); 