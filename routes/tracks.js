const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { ValidationUtils } = require('../utils/backendUtils');
const { uploadMiddleware } = require('../config/cloudinary');

const prisma = new PrismaClient();

// Upload a new track
router.post('/upload', uploadMiddleware, async (req, res) => {
    try {
        const { walletAddress, title, artist, genre } = req.body;

        // Validate wallet address and file
        const validatedWalletAddress = ValidationUtils.validateWalletAddress(walletAddress);
        
        if (!req.file) {
            return res.status(400).json({ message: 'No audio file uploaded' });
        }

        // Validate file type
        const allowedTypes = [
            'audio/mpeg',   // MP3
            'audio/wav',    // WAV
            'audio/aiff',   // AIFF
            'audio/mp4',    // M4A
            'audio/ogg'     // OGG
        ];

        if (!allowedTypes.includes(req.file.mimetype)) {
            return res.status(400).json({ 
                message: 'Unsupported audio file type' 
            });
        }

        // Find user by wallet address
        const user = await prisma.user.findUnique({
            where: { walletAddress: validatedWalletAddress }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Create track entry
        const track = await prisma.track.create({
            data: {
                title: title || req.file.originalname,
                url: req.file.path,
                artist: artist || 'Unknown Artist',
                genre: genre || 'Uncategorized',
                uploaderId: user.id,
                fileType: req.file.mimetype
            },
            include: {
                uploader: {
                    select: {
                        username: true,
                        walletAddress: true
                    }
                }
            }
        });

        res.status(201).json(track);
    } catch (error) {
        console.error('Track upload error:', error);
        res.status(500).json({ 
            message: 'Error uploading track',
            error: error.message 
        });
    }
});

// Get recent uploads
router.get('/recent', async (req, res) => {
    try {
        const tracks = await prisma.track.findMany({
            orderBy: { createdAt: 'desc' },
            take: 50,
            include: {
                uploader: {
                    select: {
                        username: true,
                        walletAddress: true
                    }
                },
                _count: {
                    select: { likes: true }
                }
            }
        });

        res.json(tracks);
    } catch (error) {
        console.error('Error fetching recent tracks:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get user's liked tracks
router.get('/liked/:walletAddress', async (req, res) => {
    try {
        const validatedWalletAddress = ValidationUtils.validateWalletAddress(req.params.walletAddress);

        const user = await prisma.user.findUnique({
            where: { walletAddress: validatedWalletAddress }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const likedTracks = await prisma.trackLike.findMany({
            where: { userId: user.id },
            include: {
                track: {
                    include: {
                        uploader: {
                            select: {
                                username: true,
                                walletAddress: true
                            }
                        },
                        _count: {
                            select: { likes: true }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json(likedTracks.map(like => like.track));
    } catch (error) {
        console.error('Error fetching liked tracks:', error);
        res.status(500).json({ message: error.message });
    }
});

// Like/Unlike a track
router.post('/:trackId/like', async (req, res) => {
    try {
        const { walletAddress } = req.body;
        const { trackId } = req.params;

        const validatedWalletAddress = ValidationUtils.validateWalletAddress(walletAddress);
        
        const user = await prisma.user.findUnique({
            where: { walletAddress: validatedWalletAddress }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if like exists
        const existingLike = await prisma.trackLike.findUnique({
            where: {
                userId_trackId: {
                    userId: user.id,
                    trackId: trackId
                }
            }
        });

        // Get the track
        const track = await prisma.track.findUnique({
            where: { id: trackId }
        });

        if (!track) {
            return res.status(404).json({ message: 'Track not found' });
        }

        if (existingLike) {
            // Unlike
            await prisma.trackLike.delete({
                where: {
                    userId_trackId: {
                        userId: user.id,
                        trackId: trackId
                    }
                }
            });
        } else {
            // Like
            await prisma.trackLike.create({
                data: {
                    userId: user.id,
                    trackId: trackId
                }
            });
        }

        // Update track with latest like information
        const updatedTrack = await prisma.track.findUnique({
            where: { id: trackId },
            include: {
                uploader: {
                    select: {
                        username: true,
                        walletAddress: true
                    }
                },
                _count: {
                    select: { likes: true }
                }
            }
        });

        res.json(updatedTrack);
    } catch (error) {
        console.error('Error liking track:', error);
        res.status(500).json({ message: error.message });
    }
});

// Search tracks
router.get('/search', async (req, res) => {
    try {
        const { query, genre } = req.query;

        const whereCondition = {
            OR: [
                { title: { contains: query, mode: 'insensitive' } },
                { artist: { contains: query, mode: 'insensitive' } }
            ]
        };

        if (genre) {
            whereCondition.genre = { equals: genre, mode: 'insensitive' };
        }

        const tracks = await prisma.track.findMany({
            where: whereCondition,
            include: {
                uploader: {
                    select: {
                        username: true,
                        walletAddress: true
                    }
                },
                _count: {
                    select: { likes: true }
                }
            },
            take: 50,
            orderBy: { playCount: 'desc' }
        });

        res.json(tracks);
    } catch (error) {
        console.error('Error searching tracks:', error);
        res.status(500).json({ message: error.message });
    }
});

// Record track play
router.post('/:trackId/play', async (req, res) => {
    try {
        const { trackId } = req.params;

        // Increment play count
        const updatedTrack = await prisma.track.update({
            where: { id: trackId },
            data: {
                playCount: {
                    increment: 1
                }
            }
        });

        res.json(updatedTrack);
    } catch (error) {
        console.error('Error recording track play:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;