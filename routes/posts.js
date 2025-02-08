const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { ValidationUtils } = require('../utils/backendUtils');

const prisma = new PrismaClient();

// Create a new post
router.post('/', async (req, res) => {
    try {
        const { walletAddress, content, mediaUrl, mediaType } = req.body;
        
        // Validate wallet address and content
        const validatedWalletAddress = ValidationUtils.validateWalletAddress(walletAddress);
        const sanitizedContent = ValidationUtils.sanitizeInput(content, 1000);

        // Find user by wallet address
        const user = await prisma.user.findUnique({
            where: { walletAddress: validatedWalletAddress }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Create post
        const post = await prisma.post.create({
            data: {
                content: sanitizedContent,
                mediaUrl,
                mediaType,
                authorId: user.id
            },
            include: {
                author: true,
                _count: {
                    select: {
                        likes: true,
                        comments: true
                    }
                }
            }
        });

        res.status(201).json(post);
    } catch (error) {
        console.error('Error creating post:', error);
        res.status(500).json({ message: error.message });
    }
});

// Get all posts
router.get('/', async (req, res) => {
    try {
        const posts = await prisma.post.findMany({
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
            },
            take: 50
        });

        res.json(posts);
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json({ message: error.message });
    }
});

// Like/Unlike a post
router.post('/:postId/like', async (req, res) => {
    try {
        const { walletAddress } = req.body;
        const { postId } = req.params;

        const validatedWalletAddress = ValidationUtils.validateWalletAddress(walletAddress);
        
        const user = await prisma.user.findUnique({
            where: { walletAddress: validatedWalletAddress }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if like exists
        const existingLike = await prisma.like.findUnique({
            where: {
                userId_postId: {
                    userId: user.id,
                    postId: postId
                }
            }
        });

        if (existingLike) {
            // Unlike
            await prisma.like.delete({
                where: {
                    userId_postId: {
                        userId: user.id,
                        postId: postId
                    }
                }
            });
        } else {
            // Like
            await prisma.like.create({
                data: {
                    userId: user.id,
                    postId: postId
                }
            });
        }

        const updatedPost = await prisma.post.findUnique({
            where: { id: postId },
            include: {
                likes: true,
                _count: {
                    select: {
                        likes: true,
                        comments: true
                    }
                }
            }
        });

        res.json(updatedPost);
    } catch (error) {
        console.error('Error liking post:', error);
        res.status(500).json({ message: error.message });
    }
});

// Add comment to post
router.post('/:postId/comment', async (req, res) => {
    try {
        const { walletAddress, content } = req.body;
        const { postId } = req.params;

        const validatedWalletAddress = ValidationUtils.validateWalletAddress(walletAddress);
        const sanitizedContent = ValidationUtils.sanitizeInput(content, 500);

        const user = await prisma.user.findUnique({
            where: { walletAddress: validatedWalletAddress }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const comment = await prisma.comment.create({
            data: {
                content: sanitizedContent,
                authorId: user.id,
                postId: postId
            },
            include: {
                author: true
            }
        });

        res.json(comment);
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;