const Anthropic = require('@anthropic-ai/sdk')

const claude = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY
})

const generateWelcomeMessage = async (language, restaurantName) => {
  try {
    const response = await claude.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `Genera un messaggio di benvenuto per un ristorante chiamato "${restaurantName}" in ${language}. 
        Il messaggio deve:
        - Iniziare con "Ciao {{firstName}}," (mantenendo esattamente questa sintassi per il placeholder)
        - Essere amichevole e professionale
        - Ringraziare il cliente per aver contattato il ristorante
        - Spiegare che questo è un sistema automatico per prenotazioni e recensioni
        - Non superare i 200 caratteri
        - Non includere emoji
        - Mantenere ESATTAMENTE la sintassi {{firstName}} senza modificarla`
      }]
    })

    return response.content[0].text
  } catch (error) {
    console.error('Claude error:', error)
    throw error
  }
}

const generateReviewMessage = async (language, restaurantName) => {
  try {
    const response = await claude.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `Genera un messaggio per richiedere una recensione per un ristorante chiamato "${restaurantName}" in ${language}.
        Il messaggio deve:
        - Iniziare con "Ciao {{firstName}}," (mantenendo esattamente questa sintassi per il placeholder)
        - Essere cortese e non troppo insistente
        - Ringraziare il cliente per la visita
        - Chiedere gentilmente di lasciare una recensione su Google
        - Non superare i 200 caratteri
        - Non includere emoji
        - Mantenere ESATTAMENTE la sintassi {{firstName}} senza modificarla`
      }]
    })

    return response.content[0].text
  } catch (error) {
    console.error('Claude error:', error)
    throw error
  }
}

module.exports = {
  generateWelcomeMessage,
  generateReviewMessage
} 