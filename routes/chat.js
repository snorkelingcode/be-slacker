const express = require('express');
const axios = require('axios');
const router = express.Router();

router.post('/', async (req, res) => {
  const { messages, walletAddress } = req.body;

  try {
    const response = await axios.post('https://api.reploy.ai/v1/chat/completions', {
      model: 'Reploy-Prod',
      messages: [
        { 
          role: 'system', 
          content: 'You are a helpful AI assistant for a social media platform called Slacker. Keep responses concise and engaging.' 
        },
        ...messages
      ],
      temperature: 0.7,
      max_tokens: 150  // Limit response length
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.REPLOY_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    // Extract the AI's response message
    const aiMessage = response.data.choices[0].message.content;

    res.json({ 
      message: aiMessage,
      metadata: {
        walletAddress,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Reploy AI Error:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Failed to generate AI response',
      details: error.response?.data?.error || error.message
    });
  }
});

module.exports = router;