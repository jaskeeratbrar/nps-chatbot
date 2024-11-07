import React, { useState } from 'react';
import './App.css';
import Chatbot from './Chatbot';

function App() {
  const [showChatbot, setShowChatbot] = useState(false);

  // Trigger Chatbot view when user enters a prompt
  const handleEnterPrompt = () => {
    setShowChatbot(true);
  };

  return (
    <div className={`App ${showChatbot ? 'chatbot-fullscreen' : ''}`}>
      {!showChatbot ? (
        <>
          <h1 className="headline">How can I help you with your NPS inquiry?</h1>
          <div className="input-container">
            <input
              type="text"
              placeholder="Ask about camping and permits..."
              className="main-input"
              onKeyPress={(e) => e.key === 'Enter' && handleEnterPrompt()}
            />
            <button className="send-button" onClick={handleEnterPrompt}>
              &#9654;
            </button>
          </div>
          <div className="example-prompts">
            <button className="prompt-button" onClick={handleEnterPrompt}>
              Find campgrounds near me
            </button>
            <button className="prompt-button" onClick={handleEnterPrompt}>
              What permits do I need for camping?
            </button>
            <button className="prompt-button" onClick={handleEnterPrompt}>
              Best trails in Yosemite
            </button>
            <button className="prompt-button" onClick={handleEnterPrompt}>
              Are pets allowed in parks?
            </button>
            <button className="prompt-button" onClick={handleEnterPrompt}>
              More
            </button>
          </div>
        </>
      ) : (
        <Chatbot />
      )}
    </div>
  );
}

export default App;
