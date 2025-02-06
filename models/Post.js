const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
    walletAddress: {
        type: String,
        required: true,
        lowercase: true
    },
    content: {
        type: String,
        required: true,
        maxLength: 1000
    },
    mediaUrl: {
        type: String,
        default: null
    },
    mediaType: {
        type: String,
        enum: ['image', 'video', null],
        default: null
    },
    likes: [{
        type: String
    }],
    comments: [{
        walletAddress: String,
        content: String,
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Post', PostSchema);