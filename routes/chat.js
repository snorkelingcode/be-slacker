const express = require('express');
const axios = require('axios');
const router = express.Router();

router.post('/', async (req, res) => {
  const { messages } = req.body;

  try {
    const response = await axios.post('https://api.reploy.ai/v1/chat/completions', {
      model: 'Reploy-Prod',
      messages: messages,
      temperature: 0.7
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.REPLOY_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    res.json(response.data);
  } catch (error) {
    console.error('Reploy AI Error:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Failed to generate AI response',
      details: error.response?.data || error.message
    });
  }
});

module.exports = router;