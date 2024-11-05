// app.js
import express from 'express';
import cookieParser from 'cookie-parser';
import authRoute from './routes/auth.route.js';
import propertyRoute from './routes/property.route.js';
import chatRoute from './routes/chat.route.js';
import favoritesRoutes from './routes/favorites.route.js';
import notificationRoutes from './routes/notification.route.js';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const app = express();
const prisma = new PrismaClient();

// Convert import.meta.url to a __dirname-like path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(cookieParser());
app.use(cors());

// Serve static files from the 'uploads' directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Use authentication and property routes
app.use('/api/auth', authRoute);
app.use('/api/properties', propertyRoute);
app.use('/api/chat', chatRoute);
// Use favorites routes
app.use('/api/favorites', favoritesRoutes);



// Create an HTTP server and integrate Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*', // Allow all origins for testing; update for production
    },
});

// Socket.IO connection event
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Join a specific chat room
    socket.on('join_room', (chatRoomId) => {
        socket.join(chatRoomId);
        console.log(`User ${socket.id} joined room: ${chatRoomId}`);
    });

    // Listen for send_message event
    socket.on('send_message', async (data) => {
        const { chatRoomId, senderId, content } = data;
    
        try {
            // Save message to the database
            const message = await prisma.message.create({
                data: {
                    chatRoomId,
                    senderId,
                    content,
                },
            });
    
            // Emit the message to users in the specific chat room
            io.to(chatRoomId).emit('receive_message', message);
            console.log('Message stored and broadcasted:', message);
        } catch (error) {
            console.error('Error saving message:', error);
        }
    });
    

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// Start the server
const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
