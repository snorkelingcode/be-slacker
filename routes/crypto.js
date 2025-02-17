const express = require('express');
const router = express.Router();
const axios = require('axios');
const { ValidationUtils } = require('../utils/backendUtils');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds
let cryptoCache = {
    data: null,
    timestamp: null
};

// CoinMarketCap API configuration
const CMC_API_KEY = process.env.COINMARKETCAP_API_KEY;
const CMC_BASE_URL = 'https://pro-api.coinmarketcap.com/v1';

// Utility function to check if cache is valid
const isCacheValid = () => {
    return cryptoCache.data && cryptoCache.timestamp && 
           (Date.now() - cryptoCache.timestamp < CACHE_DURATION);
};

// Get top cryptocurrencies
router.get('/top', async (req, res) => {
    try {
        // Check cache first
        if (isCacheValid()) {
            return res.json(cryptoCache.data);
        }

        const response = await axios.get(`${CMC_BASE_URL}/cryptocurrency/listings/latest`, {
            headers: {
                'X-CMC_PRO_API_KEY': CMC_API_KEY
            },
            params: {
                start: 1,
                limit: 100,
                convert: 'USD'
            }
        });

        // Update cache
        cryptoCache.data = response.data;
        cryptoCache.timestamp = Date.now();

        res.json(response.data);
    } catch (error) {
        console.error('CoinMarketCap API Error:', error.response?.data || error.message);
        res.status(500).json({
            message: 'Error fetching cryptocurrency data',
            error: error.message
        });
    }
});

// Get specific cryptocurrency by symbol
router.get('/crypto/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        const sanitizedSymbol = ValidationUtils.sanitizeInput(symbol.toUpperCase());

        const response = await axios.get(`${CMC_BASE_URL}/cryptocurrency/quotes/latest`, {
            headers: {
                'X-CMC_PRO_API_KEY': CMC_API_KEY
            },
            params: {
                symbol: sanitizedSymbol,
                convert: 'USD'
            }
        });

        res.json(response.data);
    } catch (error) {
        console.error('CoinMarketCap API Error:', error.response?.data || error.message);
        res.status(500).json({
            message: 'Error fetching cryptocurrency data',
            error: error.message
        });
    }
});

// User's watchlist endpoints
router.get('/watchlist/:walletAddress', async (req, res) => {
    try {
        const walletAddress = ValidationUtils.validateWalletAddress(req.params.walletAddress);

        const user = await prisma.user.findUnique({
            where: { walletAddress },
            include: {
                watchlist: true
            }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // If user has watchlist items, fetch their current data from CMC
        if (user.watchlist && user.watchlist.length > 0) {
            const symbols = user.watchlist.join(',');
            const response = await axios.get(`${CMC_BASE_URL}/cryptocurrency/quotes/latest`, {
                headers: {
                    'X-CMC_PRO_API_KEY': CMC_API_KEY
                },
                params: {
                    symbol: symbols,
                    convert: 'USD'
                }
            });

            return res.json(response.data);
        }

        res.json({ data: [] });
    } catch (error) {
        console.error('Watchlist Error:', error);
        res.status(500).json({
            message: 'Error fetching watchlist',
            error: error.message
        });
    }
});

// Add to watchlist
router.post('/watchlist/add', async (req, res) => {
    try {
        const { walletAddress, symbol } = req.body;
        
        const validatedWalletAddress = ValidationUtils.validateWalletAddress(walletAddress);
        const sanitizedSymbol = ValidationUtils.sanitizeInput(symbol.toUpperCase());

        const updatedUser = await prisma.user.update({
            where: { walletAddress: validatedWalletAddress },
            data: {
                watchlist: {
                    push: sanitizedSymbol
                }
            }
        });

        res.json(updatedUser);
    } catch (error) {
        console.error('Add to Watchlist Error:', error);
        res.status(500).json({
            message: 'Error adding to watchlist',
            error: error.message
        });
    }
});

// Remove from watchlist
router.post('/watchlist/remove', async (req, res) => {
    try {
        const { walletAddress, symbol } = req.body;
        
        const validatedWalletAddress = ValidationUtils.validateWalletAddress(walletAddress);
        const sanitizedSymbol = ValidationUtils.sanitizeInput(symbol.toUpperCase());

        const user = await prisma.user.findUnique({
            where: { walletAddress: validatedWalletAddress }
        });

        const updatedWatchlist = (user.watchlist || []).filter(s => s !== sanitizedSymbol);

        const updatedUser = await prisma.user.update({
            where: { walletAddress: validatedWalletAddress },
            data: {
                watchlist: updatedWatchlist
            }
        });

        res.json(updatedUser);
    } catch (error) {
        console.error('Remove from Watchlist Error:', error);
        res.status(500).json({
            message: 'Error removing from watchlist',
            error: error.message
        });
    }
});

module.exports = router;