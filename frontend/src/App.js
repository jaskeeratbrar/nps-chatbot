import React, { useEffect, useState } from 'react';
import './App.css';

function App() {
  const [backendMessage, setBackendMessage] = useState(''); // State to store backend message

  // Fetch data from the backend when component mounts
  useEffect(() => {
    fetch('/api') // Adjust path if necessary (proxy should handle this)
      .then(response => response.text())
      .then(data => setBackendMessage(data))
      .catch(error => console.error('Error fetching data:', error));
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>Welcome to the Camping and Permits Chatbot!</h1>
        <p>{backendMessage}</p> {/* Display backend message here */}
        <p>Your go-to app for finding campgrounds, permits, and park information.</p>
      </header>
    </div>
  );
}

export default App;
