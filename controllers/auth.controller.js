import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer'; // Import nodemailer for email
import prisma from '../lib/prisma.js';
import jwt from 'jsonwebtoken';
//import fs from 'fs/promises';
//import path from 'path';
//import { fileTypeFromBuffer } from 'file-type';
 // Base URL for the DigitalOcean Space
 const BASE_URL = `https://${process.env.DO_SPACES_REGION}.digitaloceanspaces.com/${process.env.DO_SPACES_BUCKET_NAME}`;


// **Register Function**
export const register = async (req, res) => {
    const { username, email, password, role, avatar, googleId } = req.body;

    if (!googleId && (!username || !email || !password || !role)) {
        return res.status(400).json({ error: 'All fields are required: username, email, password, and role.' });
    }

    try {
        // Check if user already exists via email or username
        const existingUser = await prisma.user.findFirst({
            where: { OR: [{ email }, { username }] },
        });

        if (existingUser) {
            return res.status(400).json({ error: 'User with this email or username already exists.' });
        }

        let newUser;
        if (googleId) {
            // Create a user with Google authentication
            newUser = await prisma.user.create({
                data: {
                    username: username || email.split('@')[0],
                    email,
                    role,
                    googleId,
                    avatar: avatar || null,
                },
            });
        } else {
            // Create a user with email/password authentication
            const hashedPassword = await bcrypt.hash(password, 10);
            newUser = await prisma.user.create({
                data: {
                    username,
                    email,
                    password: hashedPassword,
                    role,
                    avatar: avatar || null,
                },
            });
        }

        // Generate an email confirmation token
        const confirmationToken = jwt.sign(
            { id: newUser.id },
            process.env.JWT_SECRET_KEY,
            { expiresIn: '1h' },
        );

        // Generate a deep linking confirmation link
        const confirmationLink = `${process.env.APP_BASE_URL}confirm-email/${confirmationToken}`;

        // Send the confirmation email
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Email Confirmation',
            html: `
                <p>Thank you for registering!</p>
                <p>Please click the link below to confirm your email address:</p>
                <a href="${confirmationLink}">${confirmationLink}</a>
                <p>This link will expire in 1 hour.</p>
            `,
        });

        // Send a success response
        res.status(201).json({
            message: 'User registered successfully! Please check your email to confirm your email address.',
        });
    } catch (error) {
        console.error('Registration Error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};


// **Verify User Existence Function**
export const verifyUserExistence = async (req, res) => {
    const { email, username } = req.body;

    if (!email && !username) {
        return res.status(400).json({ error: 'Email or username is required.' });
    }

    try {
        // Check if a user exists with the given email or username
        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: email || undefined }, // Check if email is provided
                    { username: username || undefined }, // Check if username is provided
                ],
            },
        });

        if (user) {
            return res.status(200).json({ exists: true, message: 'User exists.' });
        }

        // If no user found, return response with exists: false
        res.status(200).json({ exists: false, message: 'User does not exist.' });
    } catch (error) {
        console.error('Verify User Existence Error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};



// **Login Function**
export const login = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username or email and password are required.' });
    }

    try {
        const user = await prisma.user.findFirst({
            where: {
                OR: [{ username }, { email: username }]
            }
        });

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

        if (!user.isConfirmed) {
            return res.status(400).json({ error: 'Please confirm your email before logging in.' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET_KEY, { expiresIn: '1h' });

        res.cookie('auth_token', token, {
            httpOnly: true,
            maxAge: 3600 * 1000,
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

        const { userId } = req.params;

        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        // Save the new avatar URL
        const avatarUrl = `${BASE_URL}/${req.file.key}`;
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

  // **Get Client Profile Function**
export const getClientProfile = async (req, res) => {
    const { userId } = req.params;

    try {
        const clientProfile = await prisma.client.findUnique({
            where: { userId },
            include: { user: true }, // Include related user details if needed
        });

        if (!clientProfile) {
            return res.status(404).json({ error: 'Client profile not found.' });
        }

        res.status(200).json({ message: 'Client profile fetched successfully!', profile: clientProfile });
    } catch (error) {
        console.error('Get Client Profile Error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};


  // Create transporter for nodemailer
const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: process.env.EMAIL_USER, // Your email address
        pass: process.env.EMAIL_PASS, // Your email password
    },
});

// **Forgot Password Function**
export const forgotPassword = async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ error: 'Email is required.' });
    }

    try {
        // Find the user by email
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(404).json({ error: 'No user found with this email.' });
        }

        // Generate a token for password reset
        const resetToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET_KEY, { expiresIn: '1h' });

        // Send email with reset link
        const resetLink = `${req.protocol}://${req.get('host')}/api/reset-password/${resetToken}`;
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Password Reset Request',
            html: `<p>Click <a href="${resetLink}">here</a> to reset your password. This link will expire in 1 hour.</p>`,
        });

        res.status(200).json({ message: 'Password reset email sent successfully!' });
    } catch (error) {
        console.error('Forgot Password Error:', error);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

// **Reset Password Function**
export const resetPassword = async (req, res) => {
    const { token } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
        return res.status(400).json({ error: 'New password is required.' });
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        const userId = decoded.id;

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update the user's password in the database
        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword },
        });

        res.status(200).json({ message: 'Password reset successfully!' });
    } catch (error) {
        console.error('Reset Password Error:', error);
        res.status(500).json({ error: 'Invalid or expired token.' });
    }
};

// **Confirm Email Function**
export const confirmEmail = async (req, res) => {
    const { token } = req.params;

    try {
        // Verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        const userId = decoded.id;

        // Find the user
        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }

        // Check if the user is already confirmed
        if (user.isConfirmed) {
            return res.status(400).json({ error: 'Email is already confirmed.' });
        }

        // Mark the user's email as confirmed
        await prisma.user.update({
            where: { id: userId },
            data: { isConfirmed: true },
        });

        // Return a success response
        res.status(200).json({
            message: 'Email confirmed successfully!',
            user: { id: user.id, email: user.email, username: user.username },
        });
    } catch (error) {
        console.error('Confirm Email Error:', error);
        res.status(400).json({ error: 'Invalid or expired token.' });
    }
};

