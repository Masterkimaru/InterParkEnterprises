import express from 'express';
import {
    uploadImages,
    addProperty,
    getAllProperties,
    getPropertiesByAgent,
    getPropertyById,
    getImageByFilename,
    getAllImageFilenames,
    getPropertyTitles,
    updateProperty,
    updatePropertyImages,
    deleteProperty,
    deleteImage

} from '../controllers/property.controller.js';
import upload from '../lib/multer.js';

const router = express.Router();

// Routes for properties and images
router.post('/upload-images', upload.array('images', 12), uploadImages);
router.post('/add', addProperty);
router.get('/', getAllProperties);
router.get('/agent/:agentLandlordId', getPropertiesByAgent);
// New route for fetching a property by propertyId
router.get('/:propertyId', getPropertyById);
router.get('/images/:filename', getImageByFilename);
router.get('/images', getAllImageFilenames);
// New route for fetching property titles
router.post('/titles', getPropertyTitles);
router.put('/update/:agentLandlordId/:propertyId', updateProperty); 
// Route for updating images for a property by propertyId
router.put('/:propertyId/images', upload.array('images', 12), updatePropertyImages);
router.delete('/delete/:agentLandlordId/:propertyId', deleteProperty);
router.delete('/images/:filename', deleteImage); // DELETE request for deleting images

export default router;
