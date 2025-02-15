const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { ValidationUtils } = require('../utils/backendUtils');
const prisma = new PrismaClient();

// Get user profile by wallet address
router.get('/profile/:walletAddress', async (req, res) => {
    try {
        const walletAddress = ValidationUtils.validateWalletAddress(req.params.walletAddress);
        
        console.log('Searching for profile with wallet address:', walletAddress);
        
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
            console.log('No user found, returning 404');
            return res.status(404).json({ 
                message: 'User profile not found',
                walletAddress: walletAddress
            });
        }
        
        console.log('User found:', user);
        res.json(user);
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({
            message: 'Error fetching user profile',
            error: error.message
        });
    }
});

// Create or update user profile
router.post('/profile', async (req, res) => {
    try {
        const { 
            walletAddress, 
            username, 
            bio,
            theme,
            profilePicture,
            bannerPicture
        } = req.body;
        
        // Validate inputs
        const validatedWalletAddress = ValidationUtils.validateWalletAddress(walletAddress);
        const sanitizedUsername = ValidationUtils.validateUsername(username);
        const sanitizedBio = ValidationUtils.sanitizeInput(bio || 'New to Slacker', 500);
        const validTheme = theme === 'dark' || theme === 'light' ? theme : undefined;

        // Create update data object
        const updateData = {
            username: sanitizedUsername,
            bio: sanitizedBio,
            updatedAt: new Date()
        };

        // Only add optional fields if they're provided
        if (validTheme) updateData.theme = validTheme;
        if (profilePicture) updateData.profilePicture = profilePicture;
        if (bannerPicture) updateData.bannerPicture = bannerPicture;

        // Create or update user using Prisma upsert
        const user = await prisma.user.upsert({
            where: {
                walletAddress: validatedWalletAddress
            },
            update: updateData,
            create: {
                walletAddress: validatedWalletAddress,
                username: sanitizedUsername,
                bio: sanitizedBio,
                theme: validTheme || 'light'
            }
        });
        
        res.status(201).json(user);
    } catch (error) {
        console.error('Error creating/updating user profile:', error);
        res.status(500).json({
            message: 'Error processing user profile',
            error: error.message
        });
    }
});

// Update theme
router.post('/profile/theme', async (req, res) => {
    try {
        const { walletAddress, theme } = req.body;
        
        const validatedWalletAddress = ValidationUtils.validateWalletAddress(walletAddress);
        
        if (!['light', 'dark'].includes(theme)) {
            return res.status(400).json({ message: 'Invalid theme value' });
        }

        const user = await prisma.user.update({
            where: {
                walletAddress: validatedWalletAddress
            },
            data: {
                theme,
                updatedAt: new Date()
            }
        });

        res.json(user);
    } catch (error) {
        console.error('Error updating theme:', error);
        res.status(500).json({ message: error.message });
    }
});

<<<<<<< HEAD
//something to push
=======
>>>>>>> parent of 856d8b3 (openai integration test)
// Clean up burner accounts
router.delete('/burner-cleanup', async (req, res) => {
    try {
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        
        const deletedUsers = await prisma.user.deleteMany({
            where: {
                accountType: 'burner',
                createdAt: {
                    lt: twentyFourHoursAgo
                }
            }
        });

        res.json({
            message: 'Burner accounts cleaned up',
            deletedCount: deletedUsers.count
        });
    } catch (error) {
        console.error('Error cleaning up burner accounts:', error);
        res.status(500).json({ message: error.message });
    }
});

// Update profile pictures
router.post('/profile/picture', async (req, res) => {
    try {
        const { walletAddress, imageType, imageUrl } = req.body;
        
        const validatedWalletAddress = ValidationUtils.validateWalletAddress(walletAddress);

        let updateData = {};
        if (imageType === 'profile') {
            updateData.profilePicture = imageUrl;
        } else if (imageType === 'banner') {
            updateData.bannerPicture = imageUrl;
        } else {
            return res.status(400).json({ message: 'Invalid image type' });
        }

        const user = await prisma.user.update({
            where: {
                walletAddress: validatedWalletAddress
            },
            data: {
                ...updateData,
                updatedAt: new Date()
            }
        });

        res.json(user);
    } catch (error) {
        console.error('Error updating profile picture:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get user's posts
router.get('/:walletAddress/posts', async (req, res) => {
    try {
        const walletAddress = ValidationUtils.validateWalletAddress(req.params.walletAddress);

        const user = await prisma.user.findUnique({
            where: { walletAddress }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const posts = await prisma.post.findMany({
            where: {
                authorId: user.id
            },
            include: {
                author: true,
                comments: {
                    include: {
                        author: true
                    }
                },
                likes: true,
                _count: {
                    select: {
                        likes: true,
                        comments: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        res.json(posts);
    } catch (error) {
        console.error('Error fetching user posts:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get all users (with pagination)
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;

        const users = await prisma.user.findMany({
            skip,
            take: limit,
            include: {
                _count: {
                    select: {
                        posts: true,
                        likes: true,
                        comments: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        const total = await prisma.user.count();

        res.json({
            users,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;