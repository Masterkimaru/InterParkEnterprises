// Import dependencies
import prisma from '../lib/prisma.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Helper to resolve the upload directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const IMAGES_DIR = path.join(__dirname, '../uploads/Propertypic');

// Base URL for the DigitalOcean Space
const BASE_URL = `https://${process.env.DO_SPACES_REGION}.digitaloceanspaces.com/${process.env.DO_SPACES_BUCKET_NAME}`;

// Controller to upload images
export const uploadImages = async (req, res) => {
    try {
        const uploadedImages = req.files.map(file => `${BASE_URL}/${file.key}`);
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

// Controller to get a property by propertyId
export const getPropertyById = async (req, res) => {
    const { propertyId } = req.params;

    if (!propertyId) {
        return res.status(400).json({ error: 'Property ID is required.' });
    }

    try {
        const property = await prisma.property.findUnique({
            where: { id: propertyId },
            include: { agentLandlord: true },
        });

        if (!property) {
            return res.status(404).json({ error: 'Property not found.' });
        }

        const formattedProperty = {
            _id: { $oid: property.id },
            title: property.title,
            location: property.location,
            type: property.type,
            nearbyPlaces: property.nearbyPlaces,
            price: { $numberDouble: property.price },
            description: property.description,
            purpose: property.purpose,
            agentLandlordId: { $oid: property.agentLandlordId },
            images: property.images.map(image => path.basename(image)),
            createdAt: { $date: { $numberLong: new Date(property.createdAt).getTime() } },
            updatedAt: { $date: { $numberLong: new Date(property.updatedAt).getTime() } },
        };

        res.status(200).json({ property: formattedProperty });
    } catch (error) {
        console.error('Error fetching property by ID:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

// Controller to get property titles based on propertyIds
export const getPropertyTitles = async (req, res) => {
    const { propertyIds } = req.body;

    if (!propertyIds || !Array.isArray(propertyIds) || propertyIds.length === 0) {
        return res.status(400).json({ error: 'Property IDs are required and must be an array.' });
    }

    try {
        // Fetch properties with the specified propertyIds
        const properties = await prisma.property.findMany({
            where: {
                id: { in: propertyIds },
            },
            select: {
                id: true,
                title: true,
            },
        });

        // Map the titles to the propertyIds
        const titles = properties.map(property => ({
            propertyId: property.id,
            title: property.title,
        }));

        res.status(200).json({ titles });
    } catch (error) {
        console.error('Error fetching property titles:', error);
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

// Controller to update a property by agentLandlordId
export const updateProperty = async (req, res) => {
    const { agentLandlordId, propertyId } = req.params;
    const { title, location, type, price, description, nearbyPlaces, images, purpose } = req.body;

    if (!title || !location || !type || !price || !description || !nearbyPlaces || !images || images.length === 0 || !purpose) {
        return res.status(400).json({ error: 'All fields are required, including images and purpose.' });
    }

    try {
        const property = await prisma.property.findUnique({ where: { id: propertyId } });
        if (!property || property.agentLandlordId !== agentLandlordId) {
            return res.status(404).json({ error: 'Property not found or unauthorized access.' });
        }

        const updatedProperty = await prisma.property.update({
            where: { id: propertyId },
            data: {
                title,
                location,
                type,
                price: parseFloat(price),
                description,
                nearbyPlaces: typeof nearbyPlaces === 'string' ? nearbyPlaces.split(',').map(p => p.trim()) : nearbyPlaces,
                images,
                purpose: purpose.toUpperCase() === 'BUY' ? 'BUY' : 'RENT',
            },
        });

        res.status(200).json({ message: 'Property updated successfully!', property: updatedProperty });
    } catch (error) {
        console.error('Error updating property:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

// Controller to update images for a property
export const updatePropertyImages = async (req, res) => {
    const { propertyId } = req.params;
    const { images } = req.body;  // Array of new image filenames

    if (!images || images.length === 0) {
        return res.status(400).json({ error: 'At least one image is required.' });
    }

    try {
        const property = await prisma.property.findUnique({
            where: { id: parseInt(propertyId) },
        });

        if (!property) {
            return res.status(404).json({ error: 'Property not found.' });
        }

        // Update the images for the property
        const updatedProperty = await prisma.property.update({
            where: { id: parseInt(propertyId) },
            data: { images: images },
        });

        res.status(200).json({
            message: 'Property images updated successfully.',
            property: updatedProperty,
        });
    } catch (error) {
        console.error('Error updating property images:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};


// Controller to delete a property by agentLandlordId
export const deleteProperty = async (req, res) => {
    const { agentLandlordId, propertyId } = req.params;

    if (!propertyId) {
        return res.status(400).json({ error: 'Property ID is required.' });
    }

    try {
        // Step 1: Find the property and ensure it exists
        const property = await prisma.property.findUnique({
            where: { id: propertyId },
            include: { chatRooms: true }, // Include chat rooms associated with the property
        });

        if (!property) {
            return res.status(404).json({ error: 'Property not found.' });
        }

        // Optional: Check if the current agentLandlordId matches the property owner
        if (property.agentLandlordId !== agentLandlordId) {
            return res.status(403).json({ error: 'You are not authorized to delete this property.' });
        }

        // Step 2: Delete related favorites (if any)
        await prisma.favorites.deleteMany({
            where: {
                propertyId: propertyId, // Delete favorites associated with the property
            },
        });

        // Step 3: Delete related chat rooms (and their messages if necessary)
        for (let chatRoom of property.chatRooms) {
            // Optionally, delete related messages first if necessary
            await prisma.message.deleteMany({
                where: { chatRoomId: chatRoom.id },
            });

            // Delete the chat room itself
            await prisma.chatRoom.delete({
                where: { id: chatRoom.id },
            });
        }

        // Step 4: Delete the property
        await prisma.property.delete({
            where: { id: propertyId },
        });

        return res.status(200).json({ message: 'Property and related chat rooms deleted successfully.' });
    } catch (error) {
        console.error('Error deleting property:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

  

// Controller to delete an image by filename
export const deleteImage = async (req, res) => {
    const { filename } = req.params;

    // Resolve the full image path
    const imagePath = path.join(IMAGES_DIR, filename);

    // Check if the image exists before attempting to delete
    fs.access(imagePath, fs.constants.F_OK, (err) => {
        if (err) {
            console.error('Image not found:', err);
            return res.status(404).json({ error: 'Image not found.' });
        }

        // If image exists, delete it
        fs.unlink(imagePath, (err) => {
            if (err) {
                console.error('Error deleting image:', err);
                return res.status(500).json({ error: 'Failed to delete image.' });
            }

            res.status(200).json({ message: 'Image deleted successfully.' });
        });
    });
};
