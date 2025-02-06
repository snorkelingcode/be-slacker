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
        const user = await User.findOne({ 
            walletAddress: req.params.walletAddress.toLowerCase() 
        });
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
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