const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const { ValidationUtils, ErrorUtils } = require('../utils/backendUtils');

// Create a new post
router.post('/', async (req, res) => {
    try {
        const { walletAddress, content, mediaUrl, mediaType } = req.body;
        
        // Validate inputs
        const validatedWalletAddress = ValidationUtils.validateWalletAddress(walletAddress);
        const sanitizedContent = ValidationUtils.sanitizeInput(content, 1000);

        // Create new post
        const post = new Post({
            walletAddress: validatedWalletAddress,
            content: sanitizedContent,
            mediaUrl: mediaUrl || null,
            mediaType: mediaType || null
        });
        
        await post.save();
        res.status(201).json(post);
    } catch (error) {
        console.error('Error creating post:', error);
        res.status(500).json(ErrorUtils.formatError(error));
    }
});

// Get all posts
router.get('/', async (req, res) => {
    try {
        const posts = await Post.find()
            .sort({ createdAt: -1 })
            .limit(50);
        res.json(posts);
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json(ErrorUtils.formatError(error));
    }
});

// Get posts for a specific user
router.get('/user/:walletAddress', async (req, res) => {
    try {
        const validatedWalletAddress = ValidationUtils.validateWalletAddress(req.params.walletAddress);
        
        const posts = await Post.find({ 
            walletAddress: validatedWalletAddress 
        }).sort({ createdAt: -1 });
        
        res.json(posts);
    } catch (error) {
        console.error('Error fetching user posts:', error);
        res.status(500).json(ErrorUtils.formatError(error));
    }
});

// Like a post
router.post('/:postId/like', async (req, res) => {
    try {
        const { walletAddress } = req.body;
        const validatedWalletAddress = ValidationUtils.validateWalletAddress(walletAddress);
        
        const post = await Post.findById(req.params.postId);
        
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }
        
        const likeIndex = post.likes.indexOf(validatedWalletAddress);
        if (likeIndex > -1) {
            post.likes.splice(likeIndex, 1);
        } else {
            post.likes.push(validatedWalletAddress);
        }
        
        await post.save();
        res.json(post);
    } catch (error) {
        console.error('Error liking post:', error);
        res.status(500).json(ErrorUtils.formatError(error));
    }
});

// Add a comment to a post
router.post('/:postId/comment', async (req, res) => {
    try {
        const { walletAddress, content } = req.body;
        
        const validatedWalletAddress = ValidationUtils.validateWalletAddress(walletAddress);
        const sanitizedContent = ValidationUtils.sanitizeInput(content, 500);
        
        const post = await Post.findById(req.params.postId);
        
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }
        
        post.comments.push({ 
            walletAddress: validatedWalletAddress, 
            content: sanitizedContent 
        });
        
        await post.save();
        res.json(post);
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json(ErrorUtils.formatError(error));
    }
});

// Delete a post
router.delete('/:postId', async (req, res) => {
    try {
        const { walletAddress } = req.body;
        const validatedWalletAddress = ValidationUtils.validateWalletAddress(walletAddress);
        
        const post = await Post.findById(req.params.postId);
        
        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }
        
        if (post.walletAddress !== validatedWalletAddress) {
            return res.status(403).json({ message: 'Not authorized to delete this post' });
        }
        
        await post.deleteOne();
        res.json({ message: 'Post deleted successfully' });
    } catch (error) {
        console.error('Error deleting post:', error);
        res.status(500).json(ErrorUtils.formatError(error));
    }
});

module.exports = router;