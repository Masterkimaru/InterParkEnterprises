import express from 'express';
import multer from 'multer'; // Import multer
import { 
    register, 
    login, 
    logout, 
    uploadAvatar, 
    getAgentProfile, 
    updateAgentProfile,
    forgotPassword,
    resetPassword,
    getClientProfile  
} from '../controllers/auth.controller.js';
import upload from '../lib/multer.js'; // Your custom multer config

const router = express.Router();

// Register Route
router.post('/register', register);

// Login Route
router.post('/login', login);

// Logout Route
router.post('/logout', logout);

// Forgot Password Route
router.post('/forgot-password', forgotPassword);

// Reset Password Route
router.post('/reset-password/:token', resetPassword);

// Upload Avatar Route
router.post('/upload-avatar/:userId', (req, res, next) => {
    upload.single('avatar')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ error: err.message });
        } else if (err) {
            return res.status(400).json({ error: 'Invalid file type or upload error.' });
        }
        next();
    });
}, uploadAvatar);

// Get Agent Profile Route
router.get('/agent-profile/:userId', getAgentProfile);

// Get Client Profile Route
router.get('/client-profile/:userId', getClientProfile);

// Update Agent Profile Route
router.put('/agent-profile/:userId', updateAgentProfile);

export default router;
