const express = require('express');
const axios = require('axios');
const router = express.Router();

router.post('/', async (req, res) => {
    // Log the entire incoming request for debugging
    console.log('Incoming AI Chat Request:', {
        body: req.body,
        headers: req.headers
    });

    const { messages, walletAddress } = req.body;

    // Validate input
    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ 
            error: 'Invalid request. Messages must be an array.' 
        });
    }

    try {
        const response = await axios.post('https://api.reploy.ai/v1/chat/completions', {
            model: 'Reploy-Prod',
            messages: [
                { 
                    role: 'system', 
                    content: 'You are a helpful AI assistant for a social media platform called Slacker. Keep responses concise, engaging, and relevant to social media interactions.' 
                },
                ...messages
            ],
            temperature: 0.7,
            max_tokens: 150
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.REPLOY_API_KEY}`,
                'Content-Type': 'application/json'
            },
            timeout: 10000 // 10 second timeout
        });

        // Log the full Reploy API response
        console.log('Reploy API Full Response:', JSON.stringify(response.data, null, 2));

        // Extract the AI's message, with fallback
        const aiMessage = response.data.choices && response.data.choices[0] && response.data.choices[0].message 
            ? response.data.choices[0].message.content 
            : 'I apologize, but I could not generate a response.';

        res.json({ 
            message: aiMessage,
            metadata: {
                walletAddress,
                timestamp: new Date().toISOString(),
                tokenUsage: response.data.usage || {}
            }
        });

    } catch (error) {
        // Detailed error logging
        console.error('Reploy AI Error:', {
            message: error.message,
            response: error.response ? error.response.data : 'No response',
            status: error.response ? error.response.status : 'No status',
            headers: error.response ? error.response.headers : 'No headers'
        });

        // Determine appropriate error response
        if (error.response) {
            // The request was made and the server responded with a status code
            res.status(error.response.status).json({
                error: 'AI service error',
                details: error.response.data,
                status: error.response.status
            });
        } else if (error.request) {
            // The request was made but no response was received
            res.status(503).json({
                error: 'No response from AI service',
                details: 'The AI service did not respond in time.'
            });
        } else {
            // Something happened in setting up the request
            res.status(500).json({
                error: 'Error setting up AI request',
                details: error.message
            });
        }
    }
});

// Optional: Add a health check endpoint
router.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'Reploy AI Chat',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;