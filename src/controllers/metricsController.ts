import { Restaurant } from '../models/Restaurant'
import { getPlaceDetails } from '../services/google/places'
import axios from 'axios'

export async function getDashboardMetrics(req, res) {
  try {
    const restaurant = await Restaurant.findOne({ owner: req.user.id })
    if (!restaurant) {
      return res.status(404).json({ message: 'Ristorante non trovato' })
    }

    // Get short.io metrics
    const shortIoMetrics = await Promise.all([
      getShortUrlClicks(restaurant.menu?.shortUrl),
      getShortUrlClicks(restaurant.reviews?.shortUrl),
      getShortUrlClicks(restaurant.qrcode?.shortUrl)
    ])

    // Get Google reviews if available
    let newReviews = 0
    if (restaurant.reviews?.platform === 'google') {
      const placeDetails = await getPlaceDetails(restaurant.google_data.place_id)
      newReviews = placeDetails.user_ratings_total - restaurant.google_data.reviews_count
    }

    res.json({
      qrScans: shortIoMetrics[2],
      menuClicks: shortIoMetrics[0], 
      reviewClicks: shortIoMetrics[1],
      newReviews: newReviews
    })
  } catch (error) {
    console.error('Metrics error:', error)
    res.status(500).json({ message: error.message })
  }
}

async function getShortUrlClicks(shortUrl: string) {
  if (!shortUrl) return 0
  
  try {
    const domain = new URL(shortUrl).hostname
    const path = new URL(shortUrl).pathname
    
    const response = await axios.get(`https://api.short.io/links/statistics`, {
      params: { domain, path },
      headers: { 
        'Authorization': process.env.SHORT_IO_API_KEY
      }
    })
    
    return response.data.clicks || 0
  } catch (error) {
    console.error('Short.io metrics error:', error)
    return 0
  }
} 