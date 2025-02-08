const mongoose = require('mongoose');

// Cache the database connection
let cachedConnection = null;

const connectDB = async () => {
    if (cachedConnection) {
        return cachedConnection;
    }

    try {
        const opts = {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            bufferCommands: false,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            family: 4
        };

        const conn = await mongoose.connect(process.env.MONGODB_URI, opts);
        
        // Minimal connection logging
        console.log('MongoDB connected');
        
        cachedConnection = conn;
        return conn;
    } catch (error) {
        console.error('MongoDB connection error:', error.message);
        throw error;
    }
};

// Handle connection errors
mongoose.connection.on('error', err => {
    console.error('MongoDB error:', err.message);
});

module.exports = connectDB;