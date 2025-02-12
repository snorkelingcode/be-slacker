require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const multer = require('multer');
const prisma = new PrismaClient();
const app = express();

// CORS Configuration
const corsOptions = {
    origin: [
        'https://fe-slacker.vercel.app', 
        'http://localhost:3000'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type', 
        'Authorization', 
        'Content-Length',
        'X-Requested-With'
    ],
    credentials: true,
    maxAge: 600
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Basic file upload configuration (temporary storage)
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/') // Make sure this directory exists
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname))
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// Ensure uploads directory exists
const fs = require('fs');
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

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

// Import and use routes
app.use('/api/users', require('./routes/users'));
app.use('/api/posts', require('./routes/posts'));

// File upload endpoint - simple version without Cloudinary
app.post('/api/upload', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // Return the file path (you might want to store this in your database)
        const filePath = `/uploads/${req.file.filename}`;
        res.json({ 
            url: filePath,
            type: req.file.mimetype.startsWith('video/') ? 'video' : 'image'
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ message: error.message });
    }
});

// Serve uploaded files statically
app.use('/uploads', express.static('uploads'));

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

module.exports = app;