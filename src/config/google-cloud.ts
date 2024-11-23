import { ImageAnnotatorClient } from '@google-cloud/vision'

// Crea il client Vision
const visionClient = new ImageAnnotatorClient({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  // oppure usando credenziali dirette:
  // credentials: {
  //   client_email: process.env.GOOGLE_CLIENT_EMAIL,
  //   private_key: process.env.GOOGLE_PRIVATE_KEY
  // }
})

export { visionClient } 