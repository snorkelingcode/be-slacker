// In a new file: routes/upload.js
const express = require('express');
const router = express.Router();
const { uploadMiddleware } = require('../config/cloudinary');
const { ValidationUtils } = require('../utils/backendUtils');

// Upload endpoint for general media
router.post('/', uploadMiddleware.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        res.json({ 
            url: req.file.path,
            type: req.file.mimetype.startsWith('video/') ? 'video' : 'image'
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ message: error.message });
    }
});

// Profile/banner image upload endpoint
router.post('/:type', uploadMiddleware.single('file'), async (req, res) => {
    try {
        const { type } = req.params;
        const { walletAddress } = req.body;

        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // Validate type and wallet address
        if (!['profile', 'banner'].includes(type)) {
            return res.status(400).json({ message: 'Invalid upload type' });
        }

        const validatedWalletAddress = ValidationUtils.validateWalletAddress(walletAddress);

        // Update user profile with new image URL
        const prisma = new PrismaClient();
        const updateData = {};
        updateData[type === 'profile' ? 'profilePicture' : 'bannerPicture'] = req.file.path;

        const user = await prisma.user.update({
            where: { walletAddress: validatedWalletAddress },
            data: updateData
        });

        res.json({ 
            url: req.file.path,
            user
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;