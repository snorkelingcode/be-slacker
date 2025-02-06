const express = require('express');
const router = express.Router();
const path = require('path');
const Post = require('../models/Post');

router.post('/', async (req, res) => {
    try {
        const { walletAddress, content, mediaUrl, mediaType } = req.body;
        
        const post = new Post({
            walletAddress,
            content,
            mediaUrl,
            mediaType
        });
        
        await post.save();
        res.status(201).json(post);
    } catch (error) {
        console.error('Error creating post:', error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/', async (req, res) => {
    try {
        const posts = await Post.find()
            .sort({ createdAt: -1 })
            .limit(50);
        res.json(posts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/user/:walletAddress', async (req, res) => {
    try {
        const posts = await Post.find({ 
            walletAddress: req.params.walletAddress.toLowerCase() 
        }).sort({ createdAt: -1 });
        res.json(posts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.delete('/:postId', async (req, res) => {
    try {
        const post = await Post.findById(req.params.postId);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        
        if (post.walletAddress !== req.body.walletAddress) {
            return res.status(403).json({ error: 'Not authorized to delete this post' });
        }
        
        await post.deleteOne();
        res.json({ message: 'Post deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/:postId/like', async (req, res) => {
    try {
        const { walletAddress } = req.body;
        const post = await Post.findById(req.params.postId);
        
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        
        const likeIndex = post.likes.indexOf(walletAddress);
        if (likeIndex > -1) {
            post.likes.splice(likeIndex, 1);
        } else {
            post.likes.push(walletAddress);
        }
        
        await post.save();
        res.json(post);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/:postId/comment', async (req, res) => {
    try {
        const { walletAddress, content } = req.body;
        const post = await Post.findById(req.params.postId);
        
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        
        post.comments.push({ walletAddress, content });
        await post.save();
        res.json(post);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;