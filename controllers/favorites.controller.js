// favorites.controller.js
import { PrismaClient } from '@prisma/client';
import path from 'path';

const prisma = new PrismaClient();

// Helper function to get clientId from userId
const getClientIdFromUserId = async (userId) => {
    try {
        const client = await prisma.client.findUnique({
            where: { userId },
        });
        return client ? client.id : null;
    } catch (error) {
        console.error('Error fetching clientId from userId:', error);
        return null;
    }
};

// Function to add a property to favorites
export const addFavorite = async (req, res) => {
    const { userId, propertyId } = req.body;

    try {
        // Get clientId using userId
        const clientId = await getClientIdFromUserId(userId);
        if (!clientId) {
            return res.status(404).json({ message: 'Client not found for this user' });
        }

        // Check if the property exists
        const propertyExists = await prisma.property.findUnique({
            where: { id: propertyId },
        });
        if (!propertyExists) {
            return res.status(404).json({ message: 'Property not found' });
        }

        // Create a new favorite entry
        const favorite = await prisma.favorites.create({
            data: { clientId, propertyId },
        });

        return res.status(201).json(favorite);
    } catch (error) {
        console.error('Error adding to favorites:', error);
        return res.status(500).json({ message: 'Error adding to favorites', error });
    }
};

// Function to remove a property from favorites
export const removeFavorite = async (req, res) => {
    const { userId, propertyId } = req.body;

    try {
        // Get clientId using userId
        const clientId = await getClientIdFromUserId(userId);
        if (!clientId) {
            return res.status(404).json({ message: 'Client not found for this user' });
        }

        // Delete the favorite entry
        const favorite = await prisma.favorites.deleteMany({
            where: { clientId, propertyId },
        });
        if (favorite.count === 0) {
            return res.status(404).json({ message: 'Favorite not found' });
        }
        return res.status(200).json({ message: 'Favorite removed successfully' });
    } catch (error) {
        console.error('Error removing from favorites:', error);
        return res.status(500).json({ message: 'Error removing from favorites', error });
    }
};

// Function to get all favorites for a user with full property details
export const getFavorites = async (req, res) => {
    const { userId } = req.params;

    try {
        // Get clientId using userId
        const clientId = await getClientIdFromUserId(userId);
        if (!clientId) {
            return res.status(404).json({ message: 'Client not found for this user' });
        }

        // Fetch favorites for the specified client and include full property details
        const favorites = await prisma.favorites.findMany({
            where: { clientId },
            include: {
                property: {
                    include: { agentLandlord: true }, // Include related agent details
                },
            },
        });

        // Format the favorites data with all necessary property details
        const formattedFavorites = favorites.map((favorite) => ({
            favoriteId: favorite.id,
            property: {
                _id: { $oid: favorite.property.id },
                title: favorite.property.title,
                location: favorite.property.location,
                type: favorite.property.type,
                price: { $numberDouble: favorite.property.price.toString() },
                description: favorite.property.description,
                nearbyPlaces: favorite.property.nearbyPlaces,
                purpose: favorite.property.purpose,
                agentLandlordId: { $oid: favorite.property.agentLandlordId },
                images: favorite.property.images.map((image) => path.basename(image)), // Format image paths
                createdAt: { $date: { $numberLong: new Date(favorite.property.createdAt).getTime() } },
                updatedAt: { $date: { $numberLong: new Date(favorite.property.updatedAt).getTime() } },
            },
        }));

        return res.status(200).json({ favorites: formattedFavorites });
    } catch (error) {
        console.error('Error fetching favorites:', error);
        return res.status(500).json({ message: 'Error fetching favorites', error });
    }
};
