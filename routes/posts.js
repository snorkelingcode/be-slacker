const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { ValidationUtils } = require('../utils/backendUtils');
const prisma = new PrismaClient();

// Create a new post
router.post('/', async (req, res) => {
    try {
        const { walletAddress, content, mediaUrl, mediaType } = req.body;
        
        console.log('Received Post Data:', { walletAddress, content, mediaUrl, mediaType });

        // Validate wallet address and content
        const validatedWalletAddress = ValidationUtils.validateWalletAddress(walletAddress);
        const sanitizedContent = ValidationUtils.sanitizeInput(content, 1000);

        // Find user by wallet address
        const user = await prisma.user.findUnique({
            where: { walletAddress: validatedWalletAddress }
        });

        console.log('Found User:', user);

        if (!user) {
            return res.status(404).json({ 
                message: 'User not found',
                walletAddress: validatedWalletAddress 
            });
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
                    },
                    orderBy: {
                        createdAt: 'desc'
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

// Get a specific post by ID
router.get('/:postId', async (req, res) => {
    try {
        const { postId } = req.params;

        const post = await prisma.post.findUnique({
            where: { id: postId },
            include: {
                author: true,
                comments: {
                    include: {
                        author: true
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                },
                likes: true,
                _count: {
                    select: {
                        likes: true,
                        comments: true
                    }
                }
            }
        });

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        res.json(post);
    } catch (error) {
        console.error('Error fetching post:', error);
        res.status(500).json({ message: error.message });
    }
});

// Delete a post
router.delete('/:postId', async (req, res) => {
    try {
        const { postId } = req.params;
        const { walletAddress } = req.body;
        
        // Validate wallet address
        const validatedWalletAddress = ValidationUtils.validateWalletAddress(walletAddress);

        // Find the post and verify ownership
        const post = await prisma.post.findUnique({
            where: { id: postId },
            include: { author: true }
        });

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        // Ensure only the post author can delete
        if (post.author.walletAddress.toLowerCase() !== validatedWalletAddress.toLowerCase()) {
            return res.status(403).json({ message: 'Not authorized to delete this post' });
        }

        // Delete related likes and comments first
        await prisma.like.deleteMany({
            where: { postId }
        });

        await prisma.comment.deleteMany({
            where: { postId }
        });

        // Delete the post
        await prisma.post.delete({
            where: { id: postId }
        });

        res.json({ 
            message: 'Post deleted successfully',
            postId 
        });
    } catch (error) {
        console.error('Error deleting post:', error);
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

        // Get the post to check author
        const post = await prisma.post.findUnique({
            where: { id: postId }
        });

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

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

            // Create notification for post author
            if (post.authorId !== user.id) {
                await prisma.notification.create({
                    data: {
                        type: 'like',
                        message: `${user.username} liked your post`,
                        recipientId: post.authorId,
                        senderId: user.id,
                        postId: postId
                    }
                });
            }
        }

        // Get updated post with complete information
        const updatedPost = await prisma.post.findUnique({
            where: { id: postId },
            include: {
                author: true,
                comments: {
                    include: {
                        author: true
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                },
                likes: true,
                _count: {
                    select: {
                        likes: true,
                        comments: true
                    }
                }
            }
        });

        if (!updatedPost) {
            return res.status(404).json({ message: 'Post not found' });
        }

        res.json(updatedPost);
    } catch (error) {
        console.error('Error liking post:', error);
        res.status(500).json({ message: error.message });
    }
});

// Add comment to post
router.post('/:postId/comment', async (req, res) => {
    try {
        const { walletAddress, content, mediaUrl, mediaType } = req.body;
        const { postId } = req.params;

        const validatedWalletAddress = ValidationUtils.validateWalletAddress(walletAddress);
        const sanitizedContent = ValidationUtils.sanitizeInput(content, 500);

        const user = await prisma.user.findUnique({
            where: { walletAddress: validatedWalletAddress }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Get the post to check author
        const post = await prisma.post.findUnique({
            where: { id: postId }
        });

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        // Create comment
        const comment = await prisma.comment.create({
            data: {
                content: sanitizedContent,
                mediaUrl,
                mediaType,
                authorId: user.id,
                postId: postId
            },
            include: {
                author: true
            }
        });

        // Create notification for post author
        if (post.authorId !== user.id) {
            await prisma.notification.create({
                data: {
                    type: 'comment',
                    message: `${user.username} commented on your post`,
                    recipientId: post.authorId,
                    senderId: user.id,
                    postId: postId
                }
            });
        }

        // Get updated post with all comments
        const updatedPost = await prisma.post.findUnique({
            where: { id: postId },
            include: {
                author: true,
                comments: {
                    include: {
                        author: true
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                },
                likes: true,
                _count: {
                    select: {
                        likes: true,
                        comments: true
                    }
                }
            }
        });

        res.status(201).json(updatedPost);
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({ message: error.message });
    }
});

// Delete a comment
router.delete('/:postId/comments/:commentId', async (req, res) => {
    try {
        const { postId, commentId } = req.params;
        const { walletAddress } = req.body;
        
        // Validate wallet address
        const validatedWalletAddress = ValidationUtils.validateWalletAddress(walletAddress);

        // Find the comment and verify ownership
        const comment = await prisma.comment.findUnique({
            where: { id: commentId },
            include: { author: true }
        });

        if (!comment) {
            return res.status(404).json({ message: 'Comment not found' });
        }

        // Ensure only the comment author can delete
        if (comment.author.walletAddress.toLowerCase() !== validatedWalletAddress.toLowerCase()) {
            return res.status(403).json({ message: 'Not authorized to delete this comment' });
        }

        // Delete the comment
        await prisma.comment.delete({
            where: { id: commentId }
        });

        // Return a success message
        res.json({ message: 'Comment deleted successfully', commentId });
    } catch (error) {
        console.error('Error deleting comment:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;