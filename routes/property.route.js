import express from 'express';
import {
    uploadImages,
    addProperty,
    getAllProperties,
    getPropertiesByAgent,
    getImageByFilename,
    getAllImageFilenames,
} from '../controllers/property.controller.js';
import upload from '../lib/multer.js';

const router = express.Router();

// Routes for properties and images
router.post('/upload-images', upload.array('images', 12), uploadImages);
router.post('/add', addProperty);
router.get('/', getAllProperties);
router.get('/agent/:agentLandlordId', getPropertiesByAgent);
router.get('/images/:filename', getImageByFilename);
router.get('/images', getAllImageFilenames);

export default router;
