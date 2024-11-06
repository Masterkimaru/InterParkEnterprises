// Import dependencies
import prisma from '../lib/prisma.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Helper to resolve the upload directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const IMAGES_DIR = path.join(__dirname, '../uploads/Propertypic');

// Base URL for images
const BASE_URL = 'https://interpark.onrender.com/uploads/Propertypic'; // Ensure this URL is correct

// Controller to upload images
export const uploadImages = async (req, res) => {
    try {
        const uploadedImages = req.files.map(file => `${BASE_URL}/${file.filename}`);
        res.status(200).json({ images: uploadedImages });
    } catch (error) {
        console.error('Image upload error:', error);
        res.status(500).json({ error: 'Failed to upload images.' });
    }
};

// Controller to add a property
export const addProperty = async (req, res) => {
    try {
        const { title, location, type, price, description, nearbyPlaces, agentLandlordId, images, purpose } = req.body;

        if (!title || !location || !type || !price || !description || 
            !nearbyPlaces || !agentLandlordId || !images || images.length === 0 || !purpose) {
            return res.status(400).json({ error: 'All fields are required, including images and purpose.' });
        }

        const parsedPrice = parseFloat(price);
        if (isNaN(parsedPrice)) {
            return res.status(400).json({ error: 'Invalid price format.' });
        }

        const parsedNearbyPlaces = 
            typeof nearbyPlaces === 'string' ? nearbyPlaces.split(',').map(p => p.trim()) : nearbyPlaces;

        // Convert purpose string to enum if it's provided as a string
        const enumPurpose = purpose.toUpperCase() === 'BUY' ? 'BUY' : 'RENT';

        const newProperty = await prisma.property.create({
            data: {
                title,
                location,
                type,
                price: parsedPrice,
                description,
                nearbyPlaces: parsedNearbyPlaces,
                agentLandlordId,
                images,
                purpose: enumPurpose, // Use the converted purpose enum
            },
        });

        res.status(201).json({ message: 'Property added successfully!', property: newProperty });
    } catch (error) {
        console.error('Error adding property:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};


// Controller to get all properties
export const getAllProperties = async (req, res) => {
    try {
        const properties = await prisma.property.findMany({ include: { agentLandlord: true } });

        const formattedProperties = properties.map(property => ({
            _id: { $oid: property.id },
            title: property.title,
            location: property.location,
            type: property.type,
            nearbyPlaces: property.nearbyPlaces,
            price: { $numberDouble: property.price },
            description: property.description,
            purpose: property.purpose, // Include purpose in the formatted response
            agentLandlordId: { $oid: property.agentLandlordId },
            images: property.images.map(image => path.basename(image)), // Just return the filename
            createdAt: { $date: { $numberLong: new Date(property.createdAt).getTime() } },
            updatedAt: { $date: { $numberLong: new Date(property.updatedAt).getTime() } },
        }));

        res.status(200).json({ properties: formattedProperties });
    } catch (error) {
        console.error('Error fetching properties:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

// Controller to get properties by AgentLandlord ID
export const getPropertiesByAgent = async (req, res) => {
    const { agentLandlordId } = req.params;

    if (!agentLandlordId) {
        return res.status(400).json({ error: 'AgentLandlord ID is required.' });
    }

    try {
        const properties = await prisma.property.findMany({
            where: { agentLandlordId },
            include: { agentLandlord: true },
        });

        if (properties.length === 0) {
            return res.status(404).json({ message: 'No properties found for this agent.' });
        }

        const formattedProperties = properties.map(property => ({
            _id: { $oid: property.id },
            title: property.title,
            location: property.location,
            type: property.type,
            nearbyPlaces: property.nearbyPlaces,
            price: { $numberDouble: property.price },
            description: property.description,
            purpose: property.purpose, // Include purpose in the formatted response
            agentLandlordId: { $oid: property.agentLandlordId },
            images: property.images.map(image => path.basename(image)), // Just return the filename
            createdAt: { $date: { $numberLong: new Date(property.createdAt).getTime() } },
            updatedAt: { $date: { $numberLong: new Date(property.updatedAt).getTime() } },
        }));

        res.status(200).json({ properties: formattedProperties });
    } catch (error) {
        console.error('Error fetching properties:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

// Serve individual image by filename
export const getImageByFilename = (req, res) => {
    const { filename } = req.params;
    const imagePath = path.join(IMAGES_DIR, filename);

    res.sendFile(imagePath, (err) => {
        if (err) {
            console.error('Error serving image:', err);
            res.status(404).json({ error: 'Image not found.' });
        }
    });
};

// Get all image filenames
export const getAllImageFilenames = (req, res) => {
    fs.readdir(IMAGES_DIR, (err, files) => {
        if (err) {
            console.error('Error reading images directory:', err);
            return res.status(500).json({ error: 'Failed to retrieve images.' });
        }

        const imageFiles = files.filter(file => /\.(jpg|jpeg|png|gif)$/.test(file));
        res.status(200).json({ images: imageFiles });
    });
};
