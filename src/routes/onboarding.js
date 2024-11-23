const express = require('express');
const router = express.Router();
const { 
    searchRestaurant, 
    importFromGoogle, 
    getImportedData, 
    generateDescription, 
    updateMenu, 
    updateReviews,
    generateWelcomeMessages,
    saveWelcomeMessages,
    generateReviewMessages,
    saveReviewMessages
} = require('../controllers/onboardingController');
const authMiddleware = require('../middleware/auth');

router.post('/search-restaurant', authMiddleware, searchRestaurant);
router.post('/import-google', authMiddleware, importFromGoogle);
router.get('/imported-data', authMiddleware, (req, res, next) => {
    console.log('Received GET request to /api/onboarding/imported-data');
    next();
}, getImportedData);
router.post('/generate-description', authMiddleware, (req, res, next) => {
    console.log('Received POST request to /api/onboarding/generate-description');
    next();
}, generateDescription);
router.post('/menu', authMiddleware, (req, res, next) => {
    console.log('Received POST request to /api/onboarding/menu');
    next();
}, updateMenu);
router.post('/reviews', authMiddleware, updateReviews);

router.post('/generate-welcome', authMiddleware, (req, res, next) => {
    console.log('Received POST request to /api/onboarding/generate-welcome');
    next();
}, generateWelcomeMessages);

router.post('/welcome-message', authMiddleware, (req, res, next) => {
    console.log('Received POST request to /api/onboarding/welcome-message');
    next();
}, saveWelcomeMessages);

router.post('/generate-review', authMiddleware, (req, res, next) => {
    console.log('Received POST request to /api/onboarding/generate-review');
    next();
}, generateReviewMessages);

router.post('/save-review-messages', authMiddleware, (req, res, next) => {
    console.log('Received POST request to /api/onboarding/save-review-messages');
    next();
}, saveReviewMessages);

module.exports = router; 