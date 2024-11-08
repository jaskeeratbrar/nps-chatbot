import React, { useState, useRef, useEffect } from 'react';

const Message = ({ message, type }) => (
  <div className={`w-full flex ${type === 'user' ? 'justify-end' : 'justify-start'} mb-4`}>
    <div 
      className={`${
        type === 'user' 
          ? 'bg-blue-600 text-white ml-8' 
          : 'bg-gray-200 text-gray-800 mr-8'
      } p-4 rounded-lg max-w-[80%]`}
    >
      {message}
    </div>
  </div>
);

const ChatInterface = () => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);

  // Smooth auto-scroll with delay
  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100); // Small delay for smoother scrolling
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    // Add user message
    setMessages(prev => [...prev, { type: 'user', text: inputText }]);

    try {
      const response = await fetch('http://localhost:5001/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userMessage: inputText }),
      });

      const data = await response.json();
      setMessages(prev => [...prev, { type: 'bot', text: data.botMessage }]);
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, { 
        type: 'bot', 
        text: 'Sorry, something went wrong. Please try again later.'
      }]);
    }

    setInputText('');
  };

  const examplePrompts = [
    'Find campgrounds near me',
    'What permits do I need for camping?',
    'Best trails in Yosemite',
    'Are pets allowed in parks?'
  ];

  const handleExampleClick = (prompt) => {
    setInputText(prompt);
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <h1 className="text-2xl font-semibold text-center text-gray-800">
          How can I help you with your NPS inquiry?
        </h1>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 bg-white">
        {messages.map((msg, index) => (
          <Message key={index} message={msg.text} type={msg.type} />
        ))}
        <div ref={messagesEndRef} />
        
        {messages.length === 0 && (
          <div className="example-prompts">
            {examplePrompts.map((prompt, index) => (
              <button
                key={index}
                onClick={() => handleExampleClick(prompt)}
                className="prompt-button"
              >
                {prompt}
              </button>
            ))}
            <button className="prompt-button">
              More
            </button>
          </div>
        )}
      </div>

      {/* Input Container */}
      <div className="border-t border-gray-200 bg-white p-4">
        <form onSubmit={handleSubmit} className="flex gap-2 w-full">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ask about camping and permits..."
            className="main-input"
          />
          <button 
            type="submit"
            className="send-button"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;
