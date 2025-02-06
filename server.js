require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const connectDB = require('./config/db');
const userRoutes = require('./routes/users');
const postRoutes = require('./routes/posts');

const app = express();

// Comprehensive CORS configuration
const corsOptions = {
    origin: [
        'https://fe-slacker.vercel.app',
        'https://fe-slacker-git-main-snorkelingcodes-projects.vercel.app',
        'https://fe-slacker-drw0hwhl1-snorkelingcodes-projects.vercel.app',
        'http://localhost:3000',
        '*'  // Use carefully in production
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
        'Origin', 
        'X-Requested-With', 
        'Content-Type', 
        'Accept', 
        'Authorization'
    ],
    credentials: true,
    optionsSuccessStatus: 200
};

// CORS middleware
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Handle preflight requests

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Existing request logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);
    next();
});

// Rest of your existing server.js code remains the same...

// Global error handler (updated)
app.use((err, req, res, next) => {
    console.error('Unhandled Error:', {
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        timestamp: new Date().toISOString()
    });
    
    // Specific CORS error handling
    if (err.name === 'CorsError') {
        return res.status(403).json({
            error: 'CORS Error',
            message: 'Access blocked by CORS policy'
        });
    }
    
    res.status(err.status || 500).json({
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error',
        path: req.path,
        timestamp: new Date().toISOString()
    });
});

module.exports = app;