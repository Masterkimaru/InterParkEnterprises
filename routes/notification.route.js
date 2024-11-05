import express from 'express';
import { registerPushToken } from '../controllers/notification.controller.js';

const router = express.Router();

// Endpoint to register push tokens
router.post('/register', registerPushToken);

export default router;
