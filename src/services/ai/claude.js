const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

async function generateWelcomeMessage(name, type, description, menuUrl, language) {
    try {
        const response = await anthropic.messages.create({
            model: "claude-3-sonnet-20240229",
            max_tokens: 300,
            messages: [{
                role: "user",
                content: `Crea un messaggio di benvenuto per:
                Nome ristorante: ${name}
                Tipo: ${type}
                Descrizione: ${description}
                Link menu: ${menuUrl}
                
                REQUISITI OBBLIGATORI:
                - In ${language}
                - Massimo 4-5 righe
                - DEVE iniziare con "Ciao ${firstName},"
                - Tono accogliente e professionale
                - DEVE includere il link al menu
                - Usa emoji appropriate ma non eccessive
                - NON tradurre il nome del ristorante
                - Il link al menu deve essere su una riga separata`
            }]
        });

        return response.content[0].text;
    } catch (error) {
        console.error('Claude error:', error);
        throw error;
    }
}

async function generateReviewMessage(name, platform, reviewUrl, language) {
    try {
        const response = await anthropic.messages.create({
            model: "claude-3-sonnet-20240229",
            max_tokens: 300,
            messages: [{
                role: "user",
                content: `Crea un messaggio per chiedere una recensione per:
                Nome ristorante: ${name}
                Piattaforma: ${platform}
                Link recensioni: ${reviewUrl}
                
                REQUISITI OBBLIGATORI:
                - In ${language}
                - Massimo 3-4 righe
                - DEVE iniziare con "Ciao ${firstName},"
                - Tono molto cordiale e personale
                - DEVE includere il link recensioni
                - Usa emoji appropriate ma non eccessive
                - NON tradurre il nome del ristorante
                - Il link deve essere su una riga separata
                - Menziona che il loro feedback è importante`
            }]
        });

        return response.content[0].text;
    } catch (error) {
        console.error('Claude error:', error);
        throw error;
    }
}

module.exports = {
    generateWelcomeMessage,
    generateReviewMessage
}; 