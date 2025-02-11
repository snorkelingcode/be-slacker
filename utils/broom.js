// Add this to your backend cleanup routines

async function cleanupGuestAccounts() {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    try {
        // Get date 24 hours ago
        const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000);

        // Find and delete inactive guest accounts
        const deletedAccounts = await prisma.user.deleteMany({
            where: {
                AND: [
                    { accountType: 'guest' },
                    { lastActive: { lt: cutoffDate } },
                ]
            }
        });

        console.log(`Cleaned up ${deletedAccounts.count} inactive guest accounts`);
        return deletedAccounts.count;
    } catch (error) {
        console.error('Error cleaning up guest accounts:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Schedule cleanup to run periodically
function scheduleGuestCleanup() {
    // Run cleanup every 6 hours
    const CLEANUP_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours in milliseconds

    setInterval(async () => {
        try {
            await cleanupGuestAccounts();
        } catch (error) {
            console.error('Scheduled cleanup failed:', error);
        }
    }, CLEANUP_INTERVAL);
}

// Start the cleanup schedule when server starts
scheduleGuestCleanup();