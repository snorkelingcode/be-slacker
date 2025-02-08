require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const connectDB = require('./config/db');
const userRoutes = require('./routes/users');
const postRoutes = require('./routes/posts');

const app = express();

// Connect to MongoDB with verbose logging
console.log('🚀 Starting server...');
console.log('📝 Attempting MongoDB connection...');

connectDB().then(() => {
    console.log('✅ MongoDB connection successful');
}).catch((err) => {
    console.error('❌ MongoDB connection failed:', err);
});

// Database initialization function
const initializeDatabase = async () => {
    try {
        // Check if collections exist, if not create them
        const collections = await mongoose.connection.db.listCollections().toArray();
        const collectionNames = collections.map(col => col.name);

        // Create users collection if it doesn't exist
        if (!collectionNames.includes('users')) {
            console.log('Creating users collection...');
            await mongoose.connection.db.createCollection('users');
        }

        // Create posts collection if it doesn't exist
        if (!collectionNames.includes('posts')) {
            console.log('Creating posts collection...');
            await mongoose.connection.db.createCollection('posts');
        }

        console.log('Database initialization complete!');
    } catch (error) {
        console.error('Error initializing database:', error);
    }
};

// Call initialization after successful connection
mongoose.connection.once('connected', async () => {
    console.log('MongoDB Connected');
    await initializeDatabase();
});

// CORS Setup
app.use(cors({
    origin: 'https://fe-slacker.vercel.app',
    credentials: true
}));

// Parse JSON bodies
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Enhanced health check endpoint
app.get('/health', async (req, res) => {
    try {
        const dbState = mongoose.connection.readyState;
        const states = {
            0: 'disconnected',
            1: 'connected',
            2: 'connecting',
            3: 'disconnecting'
        };

        // Get database stats if connected
        let dbStats = null;
        if (dbState === 1) {
            const collections = await mongoose.connection.db.listCollections().toArray();
            const userCount = await mongoose.connection.db.collection('users').countDocuments();
            dbStats = {
                collections: collections.map(c => c.name),
                userCount
            };
        }

        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            mongodb: {
                state: states[dbState],
                stats: dbStats
            },
            env: {
                node_env: process.env.NODE_ENV,
                mongodb_uri_exists: !!process.env.MONGODB_URI
            }
        });
    } catch (error) {
        console.error('Health check error:', error);
        res.status(500).json({
            status: 'error',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Request logging middleware
app.use((req, res, next) => {
    console.log(`📥 ${new Date().toISOString()} ${req.method} ${req.url}`);
    next();
});

// Register routes
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);

// Error handler
app.use((err, req, res, next) => {
    console.error('❌ Error:', {
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        timestamp: new Date().toISOString()
    });
    
    res.status(err.status || 500).json({
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error',
        path: req.path,
        timestamp: new Date().toISOString()
    });
});

const PORT = process.env.PORT || 3001;
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`🌐 Server running on port ${PORT}`);
    });
}

module.exports = app;