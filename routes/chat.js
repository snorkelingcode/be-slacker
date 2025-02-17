const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
const { ValidationUtils } = require('../utils/backendUtils');

// Initialize OpenAI with your API key
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Chat endpoint
router.post('/', async (req, res) => {
    try {
        const { message, walletAddress } = req.body;

        // Validate wallet address and sanitize message
        const validatedWalletAddress = ValidationUtils.validateWalletAddress(walletAddress);
        const sanitizedMessage = ValidationUtils.sanitizeInput(message);

        if (!sanitizedMessage) {
            return res.status(400).json({ message: 'Message is required' });
        }

        // Create chat completion with GPT-4
        const completion = await openai.chat.completions.create({
            model: "gpt-4-turbo-preview", // or "gpt-3.5-turbo" for a more economical option
            messages: [{
                role: "user",
                content: sanitizedMessage
            }],
            max_tokens: 500, // Adjust based on your needs
            temperature: 0.7,
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0
        });

        // Extract the response
        const aiResponse = completion.choices[0].message.content;

        // Send response back to client
        res.json({
            message: aiResponse,
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

// Chat stream endpoint for real-time responses
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
            model: "gpt-4-turbo-preview",
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
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
    }
});

module.exports = router;