const express = require('express');
const router = express.Router();
const OpenAI = require('openai');
const { ValidationUtils } = require('../utils/backendUtils');

router.post('/chat', async (req, res) => {
    try {
        console.log('OpenAI API Key:', process.env.OPENAI_API_KEY ? 'Present' : 'Missing');
        console.log('Request Body:', req.body);

        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });

        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: "You are a helpful AI assistant in a social media app called Slacker. Keep responses concise and friendly." },
                { role: "user", content: req.body.message }
            ],
            max_tokens: 150
        });

        const aiResponse = completion.choices[0].message.content;

        res.json({ 
            message: aiResponse,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Detailed AI Chat Error:', {
            message: error.message,
            name: error.name,
            stack: error.stack,
            code: error.code,
            details: error.response ? error.response.data : 'No additional details'
        });
        res.status(500).json({ 
            message: 'Error processing AI request',
            error: error.message 
        });
    }
});
module.exports = router;