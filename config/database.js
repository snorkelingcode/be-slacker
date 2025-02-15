// Create a new file: config/database.js
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
    errorFormat: 'pretty',
});

prisma.$on('beforeExit', async () => {
    console.log('Disconnecting from database...');
    await prisma.$disconnect();
});

// Handle connection errors
prisma.$on('query', (e) => {
    console.log('Query: ' + e.query);
    console.log('Duration: ' + e.duration + 'ms');
});

prisma.$on('error', (e) => {
    console.error('Database error:', e);
});

module.exports = prisma;