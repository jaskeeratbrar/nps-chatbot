// frontend/src/Chatbot.js
import React, { useState, useRef, useEffect } from 'react';
import './Chatbot.css';

function Chatbot() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isChatStarted, setIsChatStarted] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false); // New state for full-screen mode
  const messageEndRef = useRef(null);

  const examplePrompts = [
    "Find campgrounds near me",
    "What permits do I need for camping?",
    "What are the best trails in Yosemite?",
    "Are pets allowed in national parks?",
  ];

  const scrollToBottom = () => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  const sendMessage = () => {
    if (input.trim()) {
      if (!isChatStarted) setIsChatStarted(true);
      if (!isFullScreen) setIsFullScreen(true); // Enter full-screen mode on first message

      setMessages([...messages, { sender: 'user', text: input }]);
      setInput('');
      setTimeout(() => {
        setMessages((prevMessages) => [
          ...prevMessages,
          { sender: 'bot', text: "I'm here to help with camping and permits!" },
        ]);
      }, 1000);
    }
  };

  const handlePromptClick = (prompt) => {
    setInput(prompt);
    setTimeout(() => sendMessage(), 0); // Trigger sendMessage immediately after setting input
    if (!isChatStarted) setIsChatStarted(true);
    if (!isFullScreen) setIsFullScreen(true); // Enter full-screen mode on prompt click
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      sendMessage();
    }
  };

  return (
    <div className={`chatbot-landing ${isFullScreen ? 'full-screen' : ''}`}>
      <div className={`chatbot-container ${isChatStarted ? 'chat-expanded' : ''}`}>
        <div className="message-display">
          {messages.map((msg, index) => (
            <div key={index} className={`message ${msg.sender}`}>
              {msg.text}
            </div>
          ))}
          <div ref={messageEndRef} />
        </div>
        <div className="input-container">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me about camping and permits..."
          />
          <button onClick={sendMessage}>Send</button>
        </div>
      </div>
      
      {/* Show example prompts only if chat hasn't started */}
      {!isChatStarted && (
        <div className="example-prompts">
          <p>Try asking:</p>
          <div className="prompts">
            {examplePrompts.map((prompt, index) => (
              <button
                key={index}
                className="prompt-button"
                onClick={() => handlePromptClick(prompt)}
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Chatbot;
