const express = require('express');
const router = express.Router();
const axios = require('axios');

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
let cryptoCache = {
    data: null,
    timestamp: null
};

const isCacheValid = () => {
    return cryptoCache.data && cryptoCache.timestamp && 
           (Date.now() - cryptoCache.timestamp < CACHE_DURATION);
};

router.get('/top', async (req, res) => {
    try {
        // Check cache first
        if (isCacheValid()) {
            return res.json(cryptoCache.data);
        }

        // Fetch data from CoinGecko
        const response = await axios.get(
            'https://api.coingecko.com/api/v3/coins/markets', {
                params: {
                    vs_currency: 'usd',
                    order: 'market_cap_desc',
                    per_page: 100,
                    page: 1,
                    sparkline: false,
                    price_change_percentage: '24h'
                }
            }
        );

        // Transform data to match our frontend expectations
        const transformedData = {
            data: response.data.map(crypto => ({
                symbol: crypto.symbol.toUpperCase(),
                name: crypto.name,
                quote: {
                    USD: {
                        price: crypto.current_price,
                        percent_change_24h: crypto.price_change_percentage_24h
                    }
                }
            }))
        };

        // Update cache
        cryptoCache.data = transformedData;
        cryptoCache.timestamp = Date.now();

        res.json(transformedData);
    } catch (error) {
        console.error('CoinGecko API Error:', error);
        res.status(500).json({
            message: 'Error fetching cryptocurrency data',
            error: error.message
        });
    }
});

module.exports = router;