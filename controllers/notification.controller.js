import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Save push token in the database
export const registerPushToken = async (req, res) => {
    const { userId, token } = req.body;

    if (!userId || !token) {
        return res.status(400).json({ error: 'User ID and token are required.' });
    }

    try {
        // Store or update the push token for the user
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { pushToken: token },
        });

        return res.status(200).json({ message: 'Push token registered successfully', updatedUser });
    } catch (error) {
        console.error('Error registering push token:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
