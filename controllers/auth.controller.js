import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';
import jwt from 'jsonwebtoken';
import fs from 'fs/promises';
import path from 'path';
import { fileTypeFromBuffer } from 'file-type';
 


// **Register Function**
export const register = async (req, res) => {
    const { username, email, password, role, avatar } = req.body;

    if (!username || !email || !password || !role) {
        return res.status(400).json({ error: 'All fields are required: username, email, password, and role.' });
    }

    try {
        const existingUser = await prisma.user.findFirst({
            where: { OR: [{ email }, { username }] }
        });

        if (existingUser) {
            return res.status(400).json({ error: 'User with this email or username already exists.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await prisma.user.create({
            data: {
                username,
                email,
                password: hashedPassword,
                role,
                avatar: avatar || null,
            }
        });

        // Create role-specific profiles
        if (role === 'AGENT_LANDLORD') {
            await prisma.agentLandlord.create({
                data: {
                    userId: newUser.id,
                    phoneNumber: '',
                    nationalIdOrPassport: '',
                    agentNumber: '',
                }
            });
        } else if (role === 'CLIENT') {
            await prisma.client.create({ data: { userId: newUser.id } });
        }

        res.status(201).json({ message: 'User registered successfully!', user: newUser });
    } catch (error) {
        console.error('Registration Error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

// **Login Function**
export const login = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }

    try {
        const user = await prisma.user.findUnique({ where: { username } });

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET_KEY, { expiresIn: '1h' });

        res.cookie('auth_token', token, {
            httpOnly: true,
            maxAge: 3600 * 1000, // 1 hour
            sameSite: 'strict',
        });

        res.status(200).json({
            message: 'Login successful!',
            token,
            user: { id: user.id, username: user.username, email: user.email, avatar: user.avatar, role: user.role }
        });
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

// **Logout Function**
export const logout = (req, res) => {
    try {
        res.clearCookie('auth_token', { sameSite: 'strict' });
        res.status(200).json({ message: 'Logged out successfully.' });
    } catch (error) {
        console.error('Logout Error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

// **Upload Avatar Function**
export const uploadAvatar = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded.' });
        }

        const buffer = await fs.readFile(req.file.path);
        const detectedType = await fileTypeFromBuffer(buffer);

        if (!detectedType || !detectedType.mime.startsWith('image/')) {
            return res.status(400).json({ error: 'Invalid file type.' });
        }

        const { userId } = req.params;
        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        // Delete old avatar if exists
        if (user.avatar) {
            const oldAvatarPath = path.join(process.cwd(), user.avatar.replace(/^.*[\\/]/, ''));
            await fs.unlink(oldAvatarPath).catch(err => console.error('Error deleting old avatar:', err));
        }

        // Save the new avatar URL
        const avatarUrl = `${req.protocol}://${req.get('host')}/uploads/Propertypic/${req.file.filename}`;
        await prisma.user.update({ where: { id: userId }, data: { avatar: avatarUrl } });

        res.status(200).json({ message: 'Avatar uploaded successfully!', avatar: avatarUrl });
    } catch (error) {
        console.error('Upload Error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

// **Get Agent Profile Function**
export const getAgentProfile = async (req, res) => {
    const { userId } = req.params;

    try {
        const agentProfile = await prisma.agentLandlord.findUnique({
            where: { userId },
            include: { user: true }, // Include related user details if needed
        });

        if (!agentProfile) {
            return res.status(404).json({ error: 'Agent profile not found.' });
        }

        res.status(200).json({ message: 'Agent profile fetched successfully!', profile: agentProfile });
    } catch (error) {
        console.error('Get Agent Profile Error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

// **Update Agent Profile Function**
export const updateAgentProfile = async (req, res) => {
    const { userId } = req.params;
    const { phoneNumber, nationalIdOrPassport, agentNumber } = req.body;
  
    try {
      const agent = await prisma.agentLandlord.findUnique({ where: { userId } });
  
      if (!agent) {
        return res.status(404).json({ error: 'Agent profile not found.' });
      }
  
      const updatedAgent = await prisma.agentLandlord.update({
        where: { userId },
        data: { phoneNumber, nationalIdOrPassport, agentNumber },
      });
  
      res.status(200).json({ message: 'Agent profile updated successfully!', agent: updatedAgent });
    } catch (error) {
      console.error('Update Profile Error:', error);
      res.status(500).json({ error: 'Internal server error.' });
    }
  };
