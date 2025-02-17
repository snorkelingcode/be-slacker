const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
const { ValidationUtils } = require('../utils/backendUtils');

// Initialize OpenAI with your API key
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Chat endpoint
router.post('/stream', async (req, res) => {
    try {
        const { message, walletAddress } = req.body;

        // Validate wallet address and sanitize message
        const validatedWalletAddress = ValidationUtils.validateWalletAddress(walletAddress);
        const sanitizedMessage = ValidationUtils.sanitizeInput(message);

        if (!sanitizedMessage) {
            return res.status(400).json({ message: 'Message is required' });
        }

        // Set up SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // Create streaming chat completion
        const stream = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",  // Changed from gpt-4-turbo-preview to gpt-3.5-turbo
            messages: [{
                role: "user",
                content: sanitizedMessage
            }],
            stream: true,
            max_tokens: 500,
            temperature: 0.7
        });

        // Stream the response
        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
                res.write(`data: ${JSON.stringify({ content })}\n\n`);
            }
        }

        res.write('data: [DONE]\n\n');
        res.end();

    } catch (error) {
        console.error('ChatGPT Streaming Error:', error);
        res.status(500).json({
            message: 'Error processing chat request',
            error: error.message
        });
    }
});

// Regular chat endpoint (non-streaming)
router.post('/', async (req, res) => {
    try {
        const { message, walletAddress } = req.body;

        // Validate wallet address and sanitize message
        const validatedWalletAddress = ValidationUtils.validateWalletAddress(walletAddress);
        const sanitizedMessage = ValidationUtils.sanitizeInput(message);

        if (!sanitizedMessage) {
            return res.status(400).json({ message: 'Message is required' });
        }

        // Create chat completion
        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",  // Changed from gpt-4-turbo-preview to gpt-3.5-turbo
            messages: [{
                role: "user",
                content: sanitizedMessage
            }],
            max_tokens: 500,
            temperature: 0.7
        });

        // Send response
        res.json({
            message: completion.choices[0].message.content,
            status: 'success'
        });

    } catch (error) {
        console.error('ChatGPT API Error:', error);
        res.status(500).json({
            message: 'Error processing chat request',
            error: error.message
        });
    }
});

module.exports = router;