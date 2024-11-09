// index.js

const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config(); // Load environment variables

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json()); // Parse JSON bodies

// Import necessary libraries
const Fuse = require('fuse.js');
const nlp = require('compromise'); // For NLP functions if needed

let parkMapping = [];
let fuse;

// Fetch all parks at startup
async function fetchParkData() {
  try {
    let allParks = [];
    let start = 0;
    const limit = 50; // NPS API limit per request
    let total = 1; // Initialize with a value greater than start

    while (start < total) {
      const response = await axios.get('https://developer.nps.gov/api/v1/parks', {
        params: {
          api_key: process.env.NPS_API_KEY,
          limit: limit,
          start: start,
          fields: 'parkCode,fullName',
        },
      });

      const data = response.data;
      total = data.total;
      allParks = allParks.concat(data.data);
      start += limit;
    }

    // Create the mapping
    parkMapping = allParks.map((park) => ({
      fullName: park.fullName,
      parkCode: park.parkCode,
    }));

    // Initialize Fuse.js for fuzzy matching
    fuse = new Fuse(parkMapping, {
      keys: ['fullName'],
      threshold: 0.3, // Adjust as needed
    });

    console.log('Park data fetched and mapping created.');
  } catch (error) {
    console.error('Error fetching park data:', error);
  }
}

// Call the function to fetch park data at startup
fetchParkData();

// Import OpenAI library
const OpenAI = require('openai');

// Configure OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// In-memory storage for conversation states
const conversationStates = {};

// Helper function to generate a unique conversation ID
const generateConversationId = () => Math.random().toString(36).substring(7);

// Endpoint to handle user messages
app.post('/api/chat', async (req, res) => {
  const { userMessage, conversationId } = req.body;

  // If no conversationId is provided, generate one
  const convoId = conversationId || generateConversationId();

// Initialize conversation state if it doesn't exist
if (!conversationStates[convoId]) {
    conversationStates[convoId] = {
      stage: 'intent_recognition',
      intentData: null,
      alertsData: null,
      lastUserMessage: null,
      lastAssistantMessage: null,
      history: '',
      confirmedParkName: null, // Store confirmed park name here
    };
  }
  
  const conversationState = conversationStates[convoId];
  
  try {
    // Update conversation history
    conversationState.history += `\nUser: "${userMessage}"`;
  
    if (conversationState.stage === 'intent_recognition') {
      // Step 1: Intent Recognition
  
      const intentPrompt = `
  You are an AI assistant that identifies user intents related to National Parks.
  
  Conversation history:
  ${conversationState.history}
  
  Based on the conversation, please extract and provide the following:
  
  - **intent**: What is the user asking for? Choose one of the following intents:
    - "park_hours": User wants to know the operating hours of a park.
    - "permits": User is inquiring about permits.
    - "events": User wants information about events.
    - "alerts": User wants to **retrieve current alerts** or warnings for a park (e.g., closures, weather warnings).
    - "general_info": User is asking for general information about a park.
    - "specific_alert": User is asking for more details about a specific alert.
  
  - **park_name**: The exact name of the park involved (if any), as officially recognized by the National Park Service.
  
  - **alert_type**: If the intent is "specific_alert", specify the type of alert (e.g., "road closures", "trail closures").
  
  - **confirmation_message**: A message to confirm the intent (and alert type, if applicable) with the user.
  
  For alerts, format each alert in a **bullet-pointed or numbered summary**, highlighting key details like the title, description, category, and any available URL.
  
  Provide your response in JSON format without any additional text.
  `;
  
      const intentCompletion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: intentPrompt }],
        max_tokens: 1000,
        temperature: 0,
      });
  
      // Parse the assistant's response
      const intentResponse = intentCompletion.choices[0].message.content.trim();
      let intentData;
  
      try {
        intentData = JSON.parse(intentResponse);
      } catch (e) {
        throw new Error('Failed to parse intent data from ChatGPT.');
      }
  
      // Store intent data in conversation state
      conversationState.intentData = intentData;
  
      // If park name is confirmed, store it to avoid reconfirming
      if (intentData.park_name && !conversationState.confirmedParkName) {
        conversationState.confirmedParkName = intentData.park_name;
      }
  
      conversationState.stage = 'awaiting_confirmation';
  
      // Send confirmation message to user
      res.json({
        botMessage: intentData.confirmation_message,
        conversationId: convoId,
      });
  
      // Update conversation history
      conversationState.history += `\nAssistant: "${intentData.confirmation_message}"`;
  
    } else if (conversationState.stage === 'awaiting_confirmation') {
      // Step 2: Handle User Confirmation
      const userConfirmation = userMessage.toLowerCase();
  
      // Check if user confirms or introduces a new park name
      if (['yes', 'yeah', 'correct', 'yep', 'sure', 'right'].includes(userConfirmation)) {
        conversationState.history += `\nAssistant: "${conversationState.lastAssistantMessage}"`;
  
        // Confirmed intent and proceed without reconfirming park name
        const intent = conversationState.intentData.intent;
        const parkName = conversationState.confirmedParkName || conversationState.intentData.park_name;
  
        let functionResponse = '';
  
        if (intent === 'park_hours') {
          functionResponse = await getParkHours(parkName);
        } else if (intent === 'permits') {
          functionResponse = await getPermits(parkName);
        } else if (intent === 'events') {
          functionResponse = await getEvents(parkName);
        } else if (intent === 'general_info') {
          functionResponse = await getParkInfo(parkName);
        } else if (intent === 'alerts') {
          const alertsResult = await getAlerts(parkName);
          functionResponse = alertsResult.message;
  
          // Store alerts data in the conversation state
          conversationState.alertsData = alertsResult.data;
        } else if (intent === 'specific_alert') {
          functionResponse = await getSpecificAlert(userMessage, conversationState);
        } else if (intent === 'subscribe_alerts') {
          functionResponse = `Currently, subscribing to alerts is not supported. However, I can provide you with the latest alerts for ${parkName}. Would you like to hear them?`;
        } else {
          functionResponse = "I'm sorry, I don't have information on that topic.";
        }
  
        // Step 4: Formulate a user-friendly response
        const responsePrompt = `
  You are an AI assistant that provides information about National Parks.
  
  Based on the following data, provide a helpful response to the user.
  
  Data: "${functionResponse}"
  
  Response should be concise and informative.
  `;
  
        const responseCompletion = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: responsePrompt }],
          max_tokens: 500,
          temperature: 0.7,
        });
  
        const finalResponse = responseCompletion.choices[0].message.content.trim();
  
        // Reset conversation stage if needed
        conversationState.stage = 'intent_recognition';
        conversationState.intentData = null;
  
        // Send the response
        res.json({ botMessage: finalResponse, conversationId: convoId });
  
        // Update conversation history
        conversationState.history += `\nAssistant: "${finalResponse}"`;
        conversationState.lastAssistantMessage = finalResponse;
  
      } else {
        // User introduced new park name or did not confirm
        conversationState.confirmedParkName = null; // Reset confirmed park name to allow reconfirmation
  
        const clarificationMessage = 'I apologize for the misunderstanding. Could you please specify which park you’re asking about?';
  
        res.json({
          botMessage: clarificationMessage,
          conversationId: convoId,
        });
  
        // Update conversation history
        conversationState.history += `\nAssistant: "${clarificationMessage}"`;
      }
    }
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
    res.status(500).json({
      botMessage: 'Sorry, something went wrong. Please try again later.',
      conversationId: convoId,
    });
  }
  

// Function to get park hours from NPS API
async function getParkHours(parkName) {
  try {
    const parkCode = await getParkCode(parkName);
    if (!parkCode) {
      return `I couldn't find information for ${parkName}. Please check the park name and try again.`;
    }

    const response = await axios.get('https://developer.nps.gov/api/v1/parks', {
      params: {
        api_key: process.env.NPS_API_KEY,
        parkCode: parkCode,
        fields: 'operatingHours',
      },
    });

    const parkData = response.data.data[0];

    if (parkData.operatingHours && parkData.operatingHours.length > 0) {
      const hours = parkData.operatingHours[0].description;
      return `Operating hours for ${parkData.fullName}: ${hours}`;
    } else {
      return `Operating hours information for ${parkData.fullName} is not available.`;
    }
  } catch (error) {
    console.error('NPS API Error:', error.response ? error.response.data : error.message);
    return 'Unable to retrieve park hours at this time.';
  }
}

// Function to get park code based on park name
async function getParkCode(parkName) {
  if (!fuse) {
    console.error('Park data not loaded yet.');
    return null;
  }

  // Perform a fuzzy search for the park name
  const results = fuse.search(parkName);

  if (results.length > 0) {
    const bestMatch = results[0].item;
    console.log(`Best match for "${parkName}": ${bestMatch.fullName} (${bestMatch.parkCode})`);
    return bestMatch.parkCode;
  } else {
    console.log(`No park found for "${parkName}".`);
    return null;
  }
}

// Function to get events from NPS API
async function getEvents(parkName) {
  try {
    const parkCode = await getParkCode(parkName);
    if (!parkCode) {
      return `I couldn't find information for ${parkName}. Please check the park name and try again.`;
    }

    const response = await axios.get('https://developer.nps.gov/api/v1/events', {
      params: {
        api_key: process.env.NPS_API_KEY,
        parkCode: parkCode,
        limit: 5,
      },
    });

    const eventsData = response.data.data;

    if (eventsData.length > 0) {
      const events = eventsData.map((e) => `${e.title} on ${e.datestart}`).join('; ');
      return `Upcoming events at ${parkName}: ${events}`;
    } else {
      return `No upcoming events found for ${parkName}.`;
    }
  } catch (error) {
    console.error('NPS API Error:', error.response ? error.response.data : error.message);
    return 'Unable to retrieve events information at this time.';
  }
}

// Function to get permits from NPS API
async function getPermits(parkName) {
  try {
    const parkCode = await getParkCode(parkName);
    if (!parkCode) {
      return `I couldn't find information for ${parkName}. Please check the park name and try again.`;
    }

    const response = await axios.get('https://developer.nps.gov/api/v1/permits', {
      params: {
        api_key: process.env.NPS_API_KEY,
        parkCode: parkCode,
        limit: 5,
      },
    });

    const permitsData = response.data.data;

    if (permitsData.length > 0) {
      const permits = permitsData.map((p) => p.title).join(', ');
      return `Permits available at ${parkName}: ${permits}`;
    } else {
      return `No permit information found for ${parkName}.`;
    }
  } catch (error) {
    console.error('NPS API Error:', error.response ? error.response.data : error.message);
    return 'Unable to retrieve permit information at this time.';
  }
}

// Function to get general park information from NPS API
async function getParkInfo(parkName) {
  try {
    const parkCode = await getParkCode(parkName);
    if (!parkCode) {
      return `I couldn't find information for ${parkName}. Please check the park name and try again.`;
    }

    const response = await axios.get('https://developer.nps.gov/api/v1/parks', {
      params: {
        api_key: process.env.NPS_API_KEY,
        parkCode: parkCode,
        fields: 'description',
      },
    });

    const parkData = response.data.data[0];

    if (parkData.description) {
      return `Here's some information about ${parkData.fullName}: ${parkData.description}`;
    } else {
      return `No description available for ${parkData.fullName}.`;
    }
  } catch (error) {
    console.error('NPS API Error:', error.response ? error.response.data : error.message);
    return 'Unable to retrieve park information at this time.';
  }
}

// Function to get alerts from NPS API
// Function to get alerts from NPS API
async function getAlerts(parkName) {
    try {
      const parkCode = await getParkCode(parkName);
      if (!parkCode) {
        return {
          message: `I'm sorry, I couldn't find information for "${parkName}". Please check the park name and try again.`,
          data: null,
        };
      }
  
      const response = await axios.get('https://developer.nps.gov/api/v1/alerts', {
        params: {
          api_key: process.env.NPS_API_KEY,
          parkCode: parkCode,
          limit: 50, // Adjust as needed
        },
      });
  
      const alertsData = response.data.data;
  
      if (alertsData.length > 0) {
        // Format each alert in a bullet-point style
        let alertsSummary = alertsData.map((alert, index) => {
          return `**Alert ${index + 1}:**\n- **Title**: ${alert.title}\n- **Description**: ${alert.description}\n- **Category**: ${alert.category}\n${alert.url ? `- **More info**: [Link](${alert.url})` : ''}`;
        }).join('\n\n');
  
        return {
          message: `Here are the current alerts for ${parkName}:\n\n${alertsSummary}`,
          data: alertsData, // Return the raw alerts data
        };
      } else {
        return {
          message: `There are currently no alerts for ${parkName}.`,
          data: null,
        };
      }
    } catch (error) {
      console.error('NPS API Error:', error.response ? error.response.data : error.message);
      return {
        message: 'Unable to retrieve alerts at this time.',
        data: null,
      };
    }
  }
  

// Function to handle specific alert queries
async function getSpecificAlert(userMessage, conversationState) {
  if (!conversationState.alertsData) {
    return "I don't have any alert information to reference. Could you please specify which park you're asking about?";
  }

  // Extract alert type from userMessage
  const alertType = extractAlertType(userMessage);

  if (!alertType) {
    return "I'm sorry, I couldn't determine the specific alert you're asking about. Could you please clarify?";
  }

  // Filter the alerts data based on the alert type
  const filteredAlerts = conversationState.alertsData.filter((alert) =>
    alert.title.toLowerCase().includes(alertType) ||
    alert.description.toLowerCase().includes(alertType) ||
    alert.category.toLowerCase().includes(alertType)
  );

  if (filteredAlerts.length > 0) {
    const alertsDetails = filteredAlerts.map((alert) => {
      return `**${alert.title}**\nCategory: ${alert.category}\nDescription: ${alert.description}\nURL: ${alert.url}`;
    }).join('\n\n');

    return `Here are the details for ${alertType} in ${conversationState.intentData.park_name}:\n\n${alertsDetails}`;
  } else {
    return `There are no alerts related to "${alertType}" in ${conversationState.intentData.park_name}.`;
  }
}

// Function to extract alert type from user message
function extractAlertType(userMessage) {
  const lowerCaseMessage = userMessage.toLowerCase();

  // Define keywords for different alert types
  const alertTypes = ['road closure', 'trail closure', 'flash flood', 'cyanobacteria', 'permit', 'parking'];

  for (const type of alertTypes) {
    if (lowerCaseMessage.includes(type)) {
      return type;
    }
  }

  return null;
}

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
