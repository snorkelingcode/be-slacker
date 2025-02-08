const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI is not defined in environment variables');
        }

        console.log('Attempting to connect to MongoDB...');
        console.log('Connection URI:', process.env.MONGODB_URI.replace(/:[^:]*@/, ':****@'));

        // Add connection options for better reliability
        const connectionOptions = {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 10000, // Timeout after 10 seconds
            socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
        };

        const conn = await mongoose.connect(process.env.MONGODB_URI, connectionOptions);
        
        console.log(`✅ MongoDB Connected to host: ${conn.connection.host}`);
        
        // Detailed connection logging
        console.log('Connection state:', mongoose.connection.readyState);
        
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
        
        // More detailed error logging
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        
        // Log specific connection issues
        if (error.name === 'MongoNetworkError') {
            console.error('Network error connecting to MongoDB. Check your connection string and network.');
        }
        
        // Throw the error to be caught by the caller
        throw error;
    }
};

// Add more comprehensive connection event listeners
mongoose.connection.on('connected', () => {
    console.log('🟢 Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
    console.error('🔴 Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('🟡 Mongoose disconnected from MongoDB');
});

mongoose.connection.on('reconnected', () => {
    console.log('🔄 Mongoose reconnected to MongoDB');
});

// Handle application termination
process.on('SIGINT', async () => {
    await mongoose.connection.close();
    console.log('MongoDB connection closed through app termination');
    process.exit(0);
});

module.exports = connectDB;