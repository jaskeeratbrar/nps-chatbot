const express = require('express');
const cors = require('cors'); // Import CORS
const app = express();
const PORT = process.env.PORT || 5001;

// Enable CORS for all routes
app.use(cors());

// Define a route at /api to respond to frontend requests
app.get('/api', (req, res) => {
  res.send('Backend connection successful!');
});

// Root route for testing
app.get('/', (req, res) => {
  res.send('Welcome to the Camping and Permits Chatbot Backend!');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
