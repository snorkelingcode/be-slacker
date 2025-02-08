const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { ValidationUtils, ErrorUtils } = require('../utils/backendUtils');

// Get user profile by wallet address
router.get('/profile/:walletAddress', async (req, res) => {
    try {
        const walletAddress = ValidationUtils.validateWalletAddress(req.params.walletAddress);
        
        const user = await User.findOne({ walletAddress });
        
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

// Create or update user profile
router.post('/profile', async (req, res) => {
    try {
        const { walletAddress, username, bio } = req.body;
        
        // Validate inputs
        const validatedWalletAddress = ValidationUtils.validateWalletAddress(walletAddress);
        const sanitizedUsername = ValidationUtils.validateUsername(username);
        const sanitizedBio = ValidationUtils.sanitizeInput(bio || 'New to Slacker', 500);

        // Create or update user
        let user = await User.findOneAndUpdate(
            { walletAddress: validatedWalletAddress },
            { 
                username: sanitizedUsername, 
                bio: sanitizedBio,
                updatedAt: new Date()
            },
            { 
                new: true,  // Return updated document
                upsert: true  // Create if doesn't exist
            }
        );
        
        res.status(201).json(user);
    } catch (error) {
        console.error('Error creating/updating user profile:', error);
        res.status(500).json(ErrorUtils.formatError(error));
    }
});

// Update profile picture
router.post('/profile/picture', async (req, res) => {
    try {
        const { walletAddress, imageType, imageUrl } = req.body;
        
        const validatedWalletAddress = ValidationUtils.validateWalletAddress(walletAddress);

        let updateFields = {};
        if (imageType === 'profile') {
            updateFields.profilePicture = imageUrl;
        } else if (imageType === 'banner') {
            updateFields.bannerPicture = imageUrl;
        } else {
            return res.status(400).json({ message: 'Invalid image type' });
        }

        const user = await User.findOneAndUpdate(
            { walletAddress: validatedWalletAddress },
            { 
                ...updateFields,
                updatedAt: new Date()
            },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        console.error('Error updating profile picture:', error);
        res.status(500).json(ErrorUtils.formatError(error));
    }
});

// List all users (optional, for admin or testing)
router.get('/', async (req, res) => {
    try {
        const users = await User.find().limit(50);
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json(ErrorUtils.formatError(error));
    }
});

module.exports = router;