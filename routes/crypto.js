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
// In your backend crypto.js
router.get('/top', async (req, res) => {
    try {
        // Check cache first
        if (isCacheValid()) {
            console.log('Returning cached crypto data');
            return res.json(cryptoCache.data);
        }

        console.log('Fetching fresh crypto data from CoinMarketCap');

        const response = await axios({
            method: 'GET',
            url: 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest',
            headers: {
                'X-CMC_PRO_API_KEY': process.env.COINMARKETCAP_API_KEY,
                'Accept': 'application/json'
            },
            params: {
                start: 1,
                limit: 100,
                convert: 'USD'
            }
        });

        // Log the response for debugging
        console.log('CoinMarketCap Response:', {
            status: response.status,
            hasData: !!response.data,
            dataLength: response.data?.data?.length
        });

        if (!response.data || !response.data.data) {
            throw new Error('Invalid response from CoinMarketCap');
        }

        // Transform the data
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

        console.log('Successfully fetched and transformed crypto data');
        res.json(transformedData);
    } catch (error) {
        // Enhanced error logging
        console.error('CoinMarketCap API Error:', {
            message: error.message,
            response: {
                status: error.response?.status,
                data: error.response?.data,
                headers: error.response?.headers
            },
            stack: error.stack
        });

        res.status(500).json({
            message: 'Error fetching cryptocurrency data',
            error: error.message,
            details: error.response?.data
        });
    }
});

module.exports = router;