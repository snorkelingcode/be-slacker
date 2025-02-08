const express = require('express');
const router = express.Router();
const path = require('path');
const User = require('../models/User');

router.post('/profile', async (req, res) => {
    try {
        const { walletAddress, username, bio } = req.body;
        
        let user = await User.findOne({ walletAddress });
        
        if (user) {
            user.username = username;
            user.bio = bio;
            user.updatedAt = new Date();
            await user.save();
        } else {
            user = new User({
                walletAddress,
                username,
                bio
            });
            await user.save();
        }
        
        res.json(user);
    } catch (error) {
        console.error('Error in user profile:', error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/profile/:walletAddress', async (req, res) => {
    try {
        console.log(`Fetching profile for wallet: ${req.params.walletAddress}`);
        
        const user = await User.findOne({ 
            walletAddress: req.params.walletAddress.toLowerCase() 
        });
        
        if (!user) {
            console.log(`User not found for wallet: ${req.params.walletAddress}`);
            return res.status(404).json({
                error: 'User not found',
                message: 'No user profile exists for this wallet address'
            });
        }
        
        console.log(`User found:`, user);
        res.json(user);
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({
            error: 'Internal Server Error',
            message: error.message
        });
    }
});

router.post('/profile/picture', async (req, res) => {
    try {
        const { walletAddress, imageType, imageUrl } = req.body;
        
        const user = await User.findOne({ walletAddress });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (imageType === 'profile') {
            user.profilePicture = imageUrl;
        } else if (imageType === 'banner') {
            user.bannerPicture = imageUrl;
        }

        user.updatedAt = new Date();
        await user.save();
        
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;