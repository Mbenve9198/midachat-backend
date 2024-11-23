// src/services/botMessageValidator.js
class BotMessageValidator {
    static BLOCKED_WORDS = [
        'password',
        'credenziali',
        'bonifico',
        'pagamento',
        'carta di credito',
        'bank',
        'whatsapp:///',
        'telegram://',
        'bitcoin',
        'crypto'
    ];

    static MESSAGE_LIMITS = {
        welcome: {
            minLength: 50,
            maxLength: 500,
            requiredElements: ['{{menu_link}}', '{{wifi_info}}']
        },
        review: {
            minLength: 30,
            maxLength: 300,
            requiredElements: ['{{review_link}}']
        }
    };

    static validateMessage(type, content) {
        const limits = this.MESSAGE_LIMITS[type];
        const errors = [];

        // Verifica lunghezza
        if (content.length < limits.minLength) {
            errors.push(`Il messaggio è troppo corto (minimo ${limits.minLength} caratteri)`);
        }
        if (content.length > limits.maxLength) {
            errors.push(`Il messaggio è troppo lungo (massimo ${limits.maxLength} caratteri)`);
        }

        // Verifica elementi richiesti
        for (const element of limits.requiredElements) {
            if (!content.includes(element)) {
                errors.push(`Il messaggio deve contenere ${element}`);
            }
        }

        // Verifica parole bloccate
        for (const word of this.BLOCKED_WORDS) {
            if (content.toLowerCase().includes(word.toLowerCase())) {
                errors.push(`Il messaggio contiene una parola non consentita: ${word}`);
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    static sanitizeMessage(content) {
        let sanitized = content;
        
        // Rimuovi HTML/script tags
        sanitized = sanitized.replace(/<[^>]*>?/gm, '');
        
        // Rimuovi URLs eccetto i placeholder
        sanitized = sanitized.replace(/https?:\/\/(?!{{)[^\s]+/g, '[link rimosso]');
        
        // Rimuovi caratteri speciali
        sanitized = sanitized.replace(/[^\w\s.,!?-(){}]/g, '');
        
        return sanitized;
    }
}

module.exports = BotMessageValidator;