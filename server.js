require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const { cloudinary, upload } = require('./config/cloudinary');

const app = express();
const prisma = new PrismaClient({
    log: ['query', 'error', 'warn'],
    errorFormat: 'pretty',
});

// CORS Configuration
const corsOptions = {
    origin: [
        'https://fe-slacker.vercel.app',
        'http://localhost:3000',
        'http://localhost:5173'
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

// Request Logging Middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    console.log('Request Headers:', req.headers);
    if (req.method !== 'GET') {
        console.log('Request Body:', req.body);
    }
    next();
});

// Database connection test
async function testDbConnection() {
    try {
        await prisma.$connect();
        const result = await prisma.$queryRaw`SELECT 1`;
        console.log('Database connection test successful:', result);
        return true;
    } catch (error) {
        console.error('Database connection test failed:', error);
        return false;
    }
}

// Health Check Endpoint
app.get('/api/health', async (req, res) => {
    try {
        const dbConnected = await testDbConnection();
        
        // Test Cloudinary connection
        const cloudinaryTest = await cloudinary.api.ping();
        
        res.json({
            status: 'healthy',
            database: dbConnected ? 'connected' : 'error',
            cloudinary: cloudinaryTest ? 'connected' : 'error',
            environment: process.env.NODE_ENV,
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

// Database Test Endpoint
app.get('/api/test-db', async (req, res) => {
    try {
        const timestamp = await prisma.$queryRaw`SELECT CURRENT_TIMESTAMP`;
        const userCount = await prisma.user.count();
        
        res.json({
            status: 'success',
            timestamp: timestamp[0].current_timestamp,
            userCount,
            dbUrl: process.env.DATABASE_URL?.split('?')[0] // Hide credentials
        });
    } catch (error) {
        console.error('Database test failed:', error);
        res.status(500).json({
            status: 'error',
            message: error.message,
            code: error.code,
            meta: error.meta
        });
    }
});

// Root route
app.get('/', (req, res) => {
    res.status(200).json({
        message: 'Slacker Backend is running',
        status: 'OK',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV
    });
});

// Handle favicon requests
app.get('/favicon.ico', (req, res) => res.status(204).end());

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

// Import and use routes
app.use('/api/users', require('./routes/users'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/chat', require('./routes/chat'));  // Add this line

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

// 404 handler
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

async function startServer() {
    try {
        // Test database connection before starting
        const isConnected = await testDbConnection();
        if (!isConnected) {
            console.error('Could not establish database connection. Exiting...');
            process.exit(1);
        }

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            console.log(`Environment: ${process.env.NODE_ENV}`);
            console.log(`Database URL: ${process.env.DATABASE_URL?.split('?')[0]}`);
            console.log(`Timestamp: ${new Date().toISOString()}`);
        });
    } catch (error) {
        console.error('Server startup error:', error);
        process.exit(1);
    }
}

// Handle cleanup on shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received. Closing HTTP server and database connection...');
    await prisma.$disconnect();
    process.exit(0);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

// Start the server
startServer();

module.exports = app;