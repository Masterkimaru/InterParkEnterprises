// chat.route.js
import express from 'express';
import {
    createChatRoom,
    sendMessage,
    getMessages,
    getChatRoomsForUser // Import the new function
} from '../controllers/chat.controller.js';

const router = express.Router();

// Route to create a new chat room
router.post('/create', createChatRoom);

// Route to send a message
router.post('/send', sendMessage);

// Route to get messages from a chat room
router.get('/:chatRoomId/messages', getMessages);

// Route to fetch chat rooms for a user
router.get('/rooms/:userId', getChatRoomsForUser); // Use the base route to get chat rooms for the user

export default router;
