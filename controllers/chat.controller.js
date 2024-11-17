// chat.controller.js
import { PrismaClient } from '@prisma/client';


const prisma = new PrismaClient();


// Create a new chat room
export const createChatRoom = async (req, res) => {
    const { propertyId, agentLandlordId, clientId } = req.body;

    if (!propertyId || !agentLandlordId || !clientId) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    // Log to verify ID values
    console.log('propertyId:', propertyId, typeof propertyId);
    console.log('agentLandlordId:', agentLandlordId, typeof agentLandlordId);
    console.log('clientId:', clientId, typeof clientId);

    try {
        let chatRoom = await prisma.chatRoom.findFirst({
            where: { 
                propertyId: propertyId.toString(), 
                agentLandlordId: agentLandlordId.toString(), 
                clientId: clientId.toString() 
            },
        });

        if (!chatRoom) {
            chatRoom = await prisma.chatRoom.create({
                data: { 
                    propertyId: propertyId.toString(), 
                    agentLandlordId: agentLandlordId.toString(), 
                    clientId: clientId.toString() 
                },
            });
        }

        return res.status(201).json(chatRoom);
    } catch (error) {
        console.error('Error creating or retrieving chat room:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};




// Send a message
export const sendMessage = async (req, res) => {
    const { chatRoomId, senderId, content } = req.body;

    if (!chatRoomId || !senderId || !content) {
        return res.status(400).json({ error: 'ChatRoom ID, sender ID, and message content are required.' });
    }

    try {
        const message = await prisma.message.create({
            data: {
                chatRoomId,
                senderId,
                content,
            },
        });

        return res.status(201).json(message);
    } catch (error) {
        console.error('Error sending message:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};


// Fetch messages from a chat room
export const getMessages = async (req, res) => {
    const { chatRoomId } = req.params;

    if (!chatRoomId) {
        return res.status(400).json({ error: 'ChatRoom ID is required.' });
    }

    try {
        const messages = await prisma.message.findMany({
            where: { chatRoomId },
            orderBy: { timestamp: 'asc' }, // Order by timestamp
        });
        return res.status(200).json(messages);
    } catch (error) {
        console.error('Error fetching messages:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// Fetch chat rooms for a user
export const getChatRoomsForUser = async (req, res) => {
    const { userId } = req.params; // Retrieve userId from query parameters

    if (!userId) {
        return res.status(400).json({ error: 'User ID is required.' });
    }

    try {
        const chatRooms = await prisma.chatRoom.findMany({
            where: {
                OR: [
                    { agentLandlordId: userId }, // Include chat rooms where the user is an agent/landlord
                    { clientId: userId },        // Include chat rooms where the user is a client
                ],
            },
        });
        return res.status(200).json(chatRooms);
    } catch (error) {
        console.error('Error fetching chat rooms:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// Delete a chat room
export const deleteChatRoom = async (req, res) => {
    const { chatRoomId } = req.params;

    if (!chatRoomId) {
        return res.status(400).json({ error: 'ChatRoom ID is required.' });
    }

    try {
        // Find the chat room to ensure it exists
        const chatRoom = await prisma.chatRoom.findUnique({
            where: { id: chatRoomId },
        });

        if (!chatRoom) {
            return res.status(404).json({ error: 'Chat room not found.' });
        }

        // Delete the chat room
        await prisma.chatRoom.delete({
            where: { id: chatRoomId },
        });

        return res.status(200).json({ message: 'Chat room deleted successfully.' });
    } catch (error) {
        console.error('Error deleting chat room:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

