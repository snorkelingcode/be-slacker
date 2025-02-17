const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { ValidationUtils } = require('../utils/backendUtils');

const prisma = new PrismaClient();

// Get user's notifications
router.get('/:walletAddress', async (req, res) => {
    try {
        const walletAddress = ValidationUtils.validateWalletAddress(req.params.walletAddress);

        const user = await prisma.user.findUnique({
            where: { walletAddress }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const notifications = await prisma.notification.findMany({
            where: {
                recipientId: user.id
            },
            include: {
                sender: true,
                post: true
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 50
        });

        res.json(notifications);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ message: error.message });
    }
});

// Mark a notification as read
router.post('/:notificationId/mark-read', async (req, res) => {
    try {
        const { notificationId } = req.params;
        const { walletAddress } = req.body;

        const validatedWalletAddress = ValidationUtils.validateWalletAddress(walletAddress);

        const user = await prisma.user.findUnique({
            where: { walletAddress: validatedWalletAddress }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const notification = await prisma.notification.findFirst({
            where: {
                id: notificationId,
                recipientId: user.id
            }
        });

        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        await prisma.notification.update({
            where: { id: notificationId },
            data: { read: true }
        });

        res.json({ message: 'Notification marked as read' });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ message: error.message });
    }
});

// Mark all notifications as read
router.post('/mark-all-read', async (req, res) => {
    try {
        const { walletAddress } = req.body;

        const validatedWalletAddress = ValidationUtils.validateWalletAddress(walletAddress);

        const user = await prisma.user.findUnique({
            where: { walletAddress: validatedWalletAddress }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        await prisma.notification.updateMany({
            where: {
                recipientId: user.id,
                read: false
            },
            data: { read: true }
        });

        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;