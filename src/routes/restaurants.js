const express = require('express');
const router = express.Router();
const { getMyRestaurant, getRestaurantMessages } = require('../controllers/restaurantController');
const authMiddleware = require('../middleware/auth');

router.get('/current', authMiddleware, getMyRestaurant);
router.get('/messages', authMiddleware, getRestaurantMessages);

module.exports = router; 