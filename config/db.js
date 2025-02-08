const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI is not defined in environment variables');
        }

        console.log('Connecting to MongoDB...');
        const conn = await mongoose.connect(process.env.MONGODB_URI);
        
        console.log(`✅ MongoDB Connected to host: ${conn.connection.host}`);
        
        // Test the connection by checking collections
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('📚 Available collections:', collections.map(c => c.name));
        
        // Check if Users collection exists and get count
        try {
            const userCount = await mongoose.connection.db.collection('users').countDocuments();
            console.log('👥 Number of users in database:', userCount);
        } catch (error) {
            console.log('ℹ️ No users collection found yet - will be created when first user signs up');
        }

        return conn;
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        // Log more details about the error
        if (error.name === 'MongooseError') {
            console.error('Connection string:', process.env.MONGODB_URI ? process.env.MONGODB_URI.substring(0, 20) + '...' : 'undefined');
        }
        process.exit(1);
    }
};

// Add connection event listeners
mongoose.connection.on('connected', () => {
    console.log('🟢 MongoDB connected');
});

mongoose.connection.on('error', (err) => {
    console.error('🔴 MongoDB error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('🟡 MongoDB disconnected');
});

// Handle application termination
process.on('SIGINT', async () => {
    await mongoose.connection.close();
    console.log('MongoDB connection closed through app termination');
    process.exit(0);
});

module.exports = connectDB;