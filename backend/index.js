const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config(); // Load environment variables

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json()); // Parse JSON bodies

// Basic route to test backend connection
app.get('/api', (req, res) => {
  res.send('Backend connection successful!');
});

// Chat endpoint to handle user queries
app.post('/api/chat', async (req, res) => {
  const { userMessage } = req.body;

  try {
    let responseMessage = '';

    // Example handling for different queries
    if (userMessage.toLowerCase().includes('campgrounds')) {
      const response = await axios.get(`https://developer.nps.gov/api/v1/campgrounds`, {
        params: { api_key: process.env.NPS_API_KEY, limit: 3 }
      });
      responseMessage = `Here are some campgrounds: ${response.data.data.map(c => c.name).join(', ')}`;
    } else if (userMessage.toLowerCase().includes('permits')) {
      const response = await axios.get(`https://developer.nps.gov/api/v1/permits`, {
        params: { api_key: process.env.NPS_API_KEY }
      });
      responseMessage = `Available permits: ${response.data.data.map(p => p.title).join(', ')}`;
    } else if (userMessage.toLowerCase().includes('park')) {
      const response = await axios.get(`https://developer.nps.gov/api/v1/parks`, {
        params: { api_key: process.env.NPS_API_KEY, limit: 3 }
      });
      responseMessage = `Here are some parks: ${response.data.data.map(p => p.fullName).join(', ')}`;
    } else if (userMessage.toLowerCase().includes('alerts')) {
      const response = await axios.get(`https://developer.nps.gov/api/v1/alerts`, {
        params: { api_key: process.env.NPS_API_KEY, limit: 3 }
      });
      responseMessage = `Current alerts: ${response.data.data.map(a => `${a.title}: ${a.description}`).join(' | ')}`;
    } else {
      responseMessage = "I'm here to help with camping and permits. Please ask a specific question!";
    }

    res.json({ botMessage: responseMessage });
  } catch (error) {
    console.error('Error fetching data from NPS API:', error);
    res.status(500).json({ botMessage: 'Sorry, something went wrong. Please try again later.' });
  }
});

// Root route for testing
app.get('/', (req, res) => {
  res.send('Welcome to the Camping and Permits Chatbot Backend!');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
