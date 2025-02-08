const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { ValidationUtils, ErrorUtils } = require('../utils/backendUtils');
const crypto = require('crypto');

const prisma = new PrismaClient();

// Token generation utility
function generateSecureToken(walletAddress) {
    const tokenData = {
        walletAddress: walletAddress.toLowerCase(),
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
    };

    const tokenString = JSON.stringify(tokenData);
    const hmac = crypto.createHmac('sha256', process.env.TOKEN_SECRET || 'fallback_secret');
    const signature = hmac.update(tokenString).digest('hex');

    return Buffer.from(JSON.stringify({
        ...tokenData,
        signature
    })).toString('base64');
}

function verifySecureToken(token) {
    try {
        const tokenJson = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
        const { walletAddress, createdAt, expiresAt, signature } = tokenJson;

        // Check expiration
        const now = new Date();
        const expires = new Date(expiresAt);
        if (now > expires) {
            console.log('Token expired');
            return false;
        }

        // Regenerate signature
        const originalData = { walletAddress, createdAt, expiresAt };
        const hmac = crypto.createHmac('sha256', process.env.TOKEN_SECRET || 'fallback_secret');
        const expectedSignature = hmac.update(JSON.stringify(originalData)).digest('hex');

        // Compare signatures
        return signature === expectedSignature;
    } catch (error) {
        console.error('Token verification error:', error);
        return false;
    }
}

// Session management routes
router.post('/session', async (req, res) => {
    try {
        const { walletAddress } = req.body;
        
        // Validate wallet address
        const validatedAddress = ValidationUtils.validateWalletAddress(walletAddress);
        
        // Ensure user exists
        let user = await prisma.user.findUnique({
            where: { walletAddress: validatedAddress }
        });

        // Create user if not exists
        if (!user) {
            user = await prisma.user.create({
                data: {
                    walletAddress: validatedAddress,
                    username: `User_${validatedAddress.substring(2, 8)}`,
                    bio: 'New to Slacker'
                }
            });
        }

        // Generate secure token
        const token = generateSecureToken(validatedAddress);
        
        res.json({ 
            token,
            user: {
                id: user.id,
                walletAddress: user.walletAddress,
                username: user.username,
                bio: user.bio
            },
            message: 'Session created successfully' 
        });
    } catch (error) {
        console.error('Session creation error:', error);
        res.status(500).json(ErrorUtils.formatError(error));
    }
});

router.post('/validate-session', async (req, res) => {
    try {
        const { token } = req.body;
        
        // Validate token 
        if (!verifySecureToken(token)) {
            return res.status(401).json({ message: 'Invalid or expired session' });
        }

        // Optional: Additional user verification
        const tokenData = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
        const user = await prisma.user.findUnique({
            where: { walletAddress: tokenData.walletAddress.toLowerCase() }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ 
            message: 'Session is valid',
            user: {
                id: user.id,
                walletAddress: user.walletAddress,
                username: user.username,
                bio: user.bio
            }
        });
    } catch (error) {
        console.error('Session validation error:', error);
        res.status(500).json(ErrorUtils.formatError(error));
    }
});

router.post('/logout', async (req, res) => {
    try {
        const { walletAddress } = req.body;
        
        // Optional: Implement additional logout logic if needed
        // For example, you might want to invalidate specific tokens or log logout events
        
        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json(ErrorUtils.formatError(error));
    }
});

// Existing profile routes remain the same
router.get('/profile/:walletAddress', async (req, res) => {
    try {
        const walletAddress = ValidationUtils.validateWalletAddress(req.params.walletAddress);
        
        const user = await prisma.user.findUnique({
            where: { walletAddress },
            include: {
                _count: {
                    select: {
                        posts: true,
                        likes: true
                    }
                }
            }
        });
        
        if (!user) {
            return res.status(404).json({ 
                message: 'User profile not found',
                walletAddress: walletAddress
            });
        }
        
        res.json(user);
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json(ErrorUtils.formatError(error));
    }
});

// Existing routes for profile update, posts, etc. remain the same

module.exports = router;