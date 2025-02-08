require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();

// Optimized CORS configuration
const corsOptions = {
    origin: [
        'https://fe-slacker.vercel.app', 
        'http://localhost:3000'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 86400 // Cache preflight requests for 24 hours
};

app.use(cors(corsOptions));

// Optimize JSON parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Simplified logging for production
app.use((req, res, next) => {
    if (process.env.NODE_ENV !== 'production') {
        console.log(`${req.method} ${req.path}`);
    }
    next();
});

// Connect to MongoDB before handling routes
app.use(async (req, res, next) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            await connectDB();
        }
        next();
    } catch (error) {
        next(error);
    }
});

// Routes
app.use('/api/users', require('./routes/users'));
app.use('/api/posts', require('./routes/posts'));

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        dbState: mongoose.connection.readyState
    });
});

// Simplified error handler
app.use((err, req, res, next) => {
    console.error(err.message);
    res.status(err.status || 500).json({
        message: process.env.NODE_ENV === 'production' 
            ? 'Internal server error' 
            : err.message
    });
});

// Server startup
const PORT = process.env.PORT || 3001;
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app;