// favorites.route.js
import express from 'express';
import {
    addFavorite,
    removeFavorite,
    getFavorites,
} from '../controllers/favorites.controller.js';

const router = express.Router();

// Route to add a property to favorites
router.post('/add', addFavorite);

// Route to remove a property from favorites
router.delete('/remove', removeFavorite);

// Route to get all favorites for a client
router.get('/:clientId', getFavorites);

export default router;
