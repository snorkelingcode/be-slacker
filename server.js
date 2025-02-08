require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const app = express();

// CORS Setup
const corsOptions = {
    origin: [
        'https://fe-slacker.vercel.app', 
        'http://localhost:3000'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// Add a root route to handle the basic GET request
app.get('/', (req, res) => {
    res.status(200).json({ 
        message: 'Slacker Backend is running',
        status: 'OK'
    });
});

// Handle favicon requests
app.get('/favicon.ico', (req, res) => {
    res.status(204).end(); // No content, but successful response
});

// Routes
app.use('/api/users', require('./routes/users'));
app.use('/api/posts', require('./routes/posts'));

// Error handler
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ 
        error: err.message || 'Internal server error',
        path: req.path,
        timestamp: new Date().toISOString()
    });
});

// Catch-all route handler for any undefined routes
app.use((req, res) => {
    res.status(404).json({
        message: 'Route not found',
        path: req.path
    });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;