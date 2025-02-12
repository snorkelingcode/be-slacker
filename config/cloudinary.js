const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'slacker',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'mov'],
        resource_type: 'auto'
    }
});

const uploadMiddleware = multer({ 
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

module.exports = {
    cloudinary,
    uploadMiddleware
};

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