const express = require('express');
const router = express.Router();
const axios = require('axios');
const { ValidationUtils } = require('../utils/backendUtils');

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
let cryptoCache = {
    data: null,
    timestamp: null
};

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
            console.log('Returning cached crypto data');
            return res.json(cryptoCache.data);
        }

        console.log('Fetching fresh crypto data from CoinMarketCap');
        const response = await axios.get(`${process.env.CMC_BASE_URL}/cryptocurrency/listings/latest`, {
            headers: {
                'X-CMC_PRO_API_KEY': process.env.COINMARKETCAP_API_KEY
            },
            params: {
                start: 1,
                limit: 100,
                convert: 'USD'
            }
        });

        // Transform data to match frontend expectations
        const transformedData = {
            data: response.data.data.map(crypto => ({
                symbol: crypto.symbol,
                name: crypto.name,
                quote: {
                    USD: {
                        price: crypto.quote.USD.price,
                        percent_change_24h: crypto.quote.USD.percent_change_24h
                    }
                }
            }))
        };

        // Update cache
        cryptoCache.data = transformedData;
        cryptoCache.timestamp = Date.now();

        res.json(transformedData);
    } catch (error) {
        console.error('CoinMarketCap API Error:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status
        });

        // Send a more frontend-friendly error
        res.status(500).json({
            message: 'Error fetching cryptocurrency data',
            error: error.message
        });
    }
});

module.exports = router;