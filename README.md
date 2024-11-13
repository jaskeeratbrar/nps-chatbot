# National Parks Chatbot

A simple chatbot that helps users inquire about National Parks, including campgrounds, permits, parks, and alerts. This app uses the National Park Service (NPS) API to fetch relevant data and is integrated with Open AI API for using GPT models.

## Features

- Answers user questions about National Parks using the NPS API.
- Built with a React frontend and Express backend.
- Optionally integrates with OpenAI or Hugging Face for NLP-based responses.

## Getting Started

### Prerequisites

1. **Node.js** - Install from [nodejs.org](https://nodejs.org/).
2. **NPS API Key** - Sign up at [NPS API](https://www.nps.gov/subjects/developer/get-started.htm) to get an API key.
3. **OpenAI API Key** - Sign up at [OpenAI](https://platform.openai.com/signup).

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/jaskeeratbrar/nps-chatbot.git
   cd nps-chatbot
   ```
2. Install dependencies for both backend and frontend:
   ```bash
   cd backend
   npm install

   cd frontend
   npm install
   ```
3. Create a .env file in the backend folder with your API keys:
   ```bash
   PORT=5001
   NPS_API_KEY=your_nps_api_key
   OPENAI_API_KEY=your_openai_api_key  
   ```
4. Running the application, open two terminals and run commands below:
   ```bash
   cd backend
   npm start

   cd frontend
   npm start
   ```

## Usage
- Visit http://localhost:3000 in your browser.
- As questions about National parks like:
  "Any active alerts in Yosemite"
  "What permits do I need for camping?"

## Folder Structure
    
    ├── backend               # Express server and API integration
    │   ├── index.js          # Main server file
    │   └── .env              # Environment variables (not included in repo)
    ├── frontend              # React app
    │   ├── src
    │   │   ├── App.js        # Main React component
    │   │   ├── index.js      # React entry point
    │   └── public
    └── README.md             # Project documentation

## License

MIT License

## Contributing

Contributions are welcome! If you'd like to contribute, please fork the repository and make a pull request.

## Contact

For questions or support, please conntact jbrar@1938@gmail.com
