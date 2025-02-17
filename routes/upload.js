const express = require('express');
const router = express.Router();
const { uploadMiddleware } = require('../config/cloudinary');
const { ValidationUtils } = require('../utils/backendUtils');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Upload endpoint for general media
router.post('/', uploadMiddleware.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // Validate file size
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (req.file.size > maxSize) {
            return res.status(400).json({ message: 'File size exceeds 10MB limit' });
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/quicktime'];
        if (!allowedTypes.includes(req.file.mimetype)) {
            return res.status(400).json({ 
                message: 'Unsupported file type. Please upload JPG, PNG, GIF, MP4, or MOV files only.' 
            });
        }

        // Log successful upload
        console.log('File uploaded successfully:', {
            filename: req.file.originalname,
            type: req.file.mimetype,
            size: req.file.size,
            path: req.file.path
        });

        res.json({ 
            url: req.file.path,
            type: req.file.mimetype.startsWith('video/') ? 'video' : 'image'
        });
    } catch (error) {
        console.error('Upload error:', {
            error: error.message,
            stack: error.stack,
            file: req.file
        });
        res.status(500).json({ 
            message: 'Error uploading file',
            error: error.message 
        });
    }
});

// Profile/banner image upload endpoint
router.post('/:type', uploadMiddleware.single('file'), async (req, res) => {
    try {
        const { type } = req.params;
        const { walletAddress } = req.body;

        console.log('Upload Request:', { 
            type, 
            walletAddress, 
            file: req.file ? {
                originalname: req.file.originalname,
                mimetype: req.file.mimetype,
                size: req.file.size
            } : 'No file'
        });

        // Validate file presence
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // Validate file size
        const maxSize = 5 * 1024 * 1024; // 5MB for profile/banner images
        if (req.file.size > maxSize) {
            return res.status(400).json({ message: 'File size exceeds 5MB limit' });
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (!allowedTypes.includes(req.file.mimetype)) {
            return res.status(400).json({ 
                message: 'Unsupported file type. Please upload JPG, PNG, or GIF files only.' 
            });
        }

        // Validate type and wallet address
        if (!['profile', 'banner'].includes(type)) {
            return res.status(400).json({ message: 'Invalid upload type' });
        }

        const validatedWalletAddress = ValidationUtils.validateWalletAddress(walletAddress);

        // Update user profile with new image URL
        const updateData = {};
        updateData[type === 'profile' ? 'profilePicture' : 'bannerPicture'] = req.file.path;

        try {
            const user = await prisma.user.update({
                where: { walletAddress: validatedWalletAddress },
                data: updateData
            });

            console.log('Profile/banner updated successfully:', {
                type,
                walletAddress: validatedWalletAddress,
                url: req.file.path
            });

            res.json({ 
                url: req.file.path,
                user
            });
        } catch (updateError) {
            console.error('User update error:', {
                error: updateError.message,
                stack: updateError.stack,
                walletAddress: validatedWalletAddress,
                type
            });
            res.status(500).json({ 
                message: 'Error updating user profile',
                error: updateError.message 
            });
        }
    } catch (error) {
        console.error('Upload error:', {
            error: error.message,
            stack: error.stack,
            type: req.params.type,
            walletAddress: req.body.walletAddress
        });
        res.status(500).json({ 
            message: 'Error processing upload request',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

module.exports = router;