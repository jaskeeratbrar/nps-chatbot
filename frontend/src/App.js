// App.js

import React, { useState, useRef, useEffect } from 'react';

const Message = ({ message, type }) => (
  <div className={`message ${type}`}>
    {message}
  </div>
);

const ChatInterface = () => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);
  const [conversationId, setConversationId] = useState(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMessage = inputText;
    setInputText('');

    // Add user message to chat
    setMessages((prev) => [...prev, { type: 'user', text: userMessage }]);

    try {
      const response = await fetch('http://localhost:5001/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userMessage, conversationId }),
      });

      const data = await response.json();

      // Update conversation ID if not set
      if (!conversationId) {
        setConversationId(data.conversationId);
      }

      // Add bot message to chat
      setMessages((prev) => [...prev, { type: 'bot', text: data.botMessage }]);
    } catch (error) {
      console.error('Error:', error);
      setMessages((prev) => [
        ...prev,
        {
          type: 'bot',
          text: 'Sorry, something went wrong. Please try again later.',
        },
      ]);
    }
  };

  return (
    <div className="App">
      {/* Header */}
      <div className="headline">
        <h1>Welcome to the NPS Chatbot</h1>
        <p>Ask me anything about national parks, camping, and permits.</p>
      </div>

      {/* Messages Container */}
      <div className="messages-container">
        {messages.map((msg, index) => (
          <Message key={index} message={msg.text} type={msg.type} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Container */}
      <div className="input-container">
        <form onSubmit={handleSubmit} className="form-container">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type your message..."
            className="main-input"
          />
          <button type="submit" className="send-button">
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;
