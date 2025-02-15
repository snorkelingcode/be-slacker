require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const prisma = new PrismaClient();
const { cloudinary, upload } = require('./config/cloudinary');

const app = express();

// CORS Configuration
const corsOptions = {
    origin: [
        'https://fe-slacker.vercel.app',
        'http://localhost:3000',
        'http://localhost:5173',  // Add any other local development ports
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin'
    ],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Root route
app.get('/', (req, res) => {
    res.status(200).json({ 
        message: 'Slacker Backend is running',
        status: 'OK',
        timestamp: new Date().toISOString()
    });
});

// Handle favicon requests
app.get('/favicon.ico', (req, res) => {
    res.status(204).end();
});

// File upload endpoints
app.post('/api/upload', upload.single('file'), async (req, res) => {
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

app.post('/api/upload/:type', upload.single('file'), async (req, res) => {
    try {
        const { type } = req.params;
        const { walletAddress } = req.body;

        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        if (!['profile', 'banner'].includes(type)) {
            return res.status(400).json({ message: 'Invalid upload type' });
        }

        const updateData = {};
        updateData[type === 'profile' ? 'profilePicture' : 'bannerPicture'] = req.file.path;

        const user = await prisma.user.update({
            where: { walletAddress },
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

app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    console.log('Request Body:', req.body);
    console.log('Request Headers:', req.headers);
    
    // Capture response
    const oldSend = res.send;
    res.send = function(data) {
        console.log('Response:', data);
        return oldSend.apply(res, arguments);
    };
    
    next();
});

// Import and use routes
app.use('/api/users', require('./routes/users'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/ai', require('./routes/ai'));

// Global error handler
app.use((err, req, res, next) => {
    console.error('Error:', {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
    });

    res.status(500).json({ 
        error: err.message || 'Internal server error',
        path: req.path,
        timestamp: new Date().toISOString()
    });
});

// 404 handler - Keep this last
app.use((req, res) => {
    res.status(404).json({
        message: 'Route not found',
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
    });
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
    console.log(`Timestamp: ${new Date().toISOString()}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    // Gracefully shutdown
    process.exit(1);
});

// Add to server.js
app.get('/api/health', async (req, res) => {
    try {
        // Test database connection
        await prisma.$queryRaw`SELECT 1`;
        
        // Test Cloudinary connection
        const cloudinaryTest = await cloudinary.api.ping();
        
        res.json({
            status: 'healthy',
            database: 'connected',
            cloudinary: cloudinaryTest.status === 200 ? 'connected' : 'error',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Health check failed:', error);
        res.status(500).json({
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

module.exports = app;