const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        console.log('Attempting to connect to MongoDB...');
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 60000, // Timeout after 60s
            socketTimeoutMS: 60000,
        });
        
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        return conn;
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
};

module.exports = connectDB;