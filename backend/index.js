const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

const Fuse = require('fuse.js');
const OpenAI = require('openai');

const NPS_BASE = 'https://developer.nps.gov/api/v1';
const MODEL = 'gpt-4o-mini';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── Cache ────────────────────────────────────────────────────────────────────

const TTL = {
  essentials:      24 * 60 * 60 * 1000,  // 24 hours — rarely changes
  campgrounds:     24 * 60 * 60 * 1000,
  visitor_centers: 24 * 60 * 60 * 1000,
  things_to_do:    24 * 60 * 60 * 1000,
  fees_passes:     24 * 60 * 60 * 1000,
  webcams:         24 * 60 * 60 * 1000,
  alerts:          30 * 60 * 1000,        // 30 min — changes frequently
  events:          60 * 60 * 1000,        // 1 hour
  road_conditions: 30 * 60 * 1000,
};

const cache = new Map();

function getCache(category, parkName) {
  const key = `${category}:${parkName}`;
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > (TTL[category] || TTL.essentials)) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(category, parkName, data) {
  cache.set(`${category}:${parkName}`, { data, ts: Date.now() });
}

// ─── Park index (loaded at startup) ──────────────────────────────────────────

let parkMapping = [];
let fuse;

async function fetchParkData() {
  try {
    let allParks = [];
    let start = 0;
    const limit = 50;
    let total = 1;

    while (start < total) {
      const { data } = await axios.get(`${NPS_BASE}/parks`, {
        params: { api_key: process.env.NPS_API_KEY, limit, start, fields: 'parkCode,fullName' },
      });
      total = data.total;
      allParks = allParks.concat(data.data);
      start += limit;
    }

    parkMapping = allParks.map(({ fullName, parkCode }) => ({ fullName, parkCode }));
    fuse = new Fuse(parkMapping, { keys: ['fullName'], threshold: 0.4 });
    console.log(`Park index ready — ${parkMapping.length} parks loaded.`);
  } catch (err) {
    console.error('Error fetching park data:', err.message);
  }
}

const POPULAR_PARKS = [
  'Yellowstone National Park',
  'Yosemite National Park',
  'Grand Canyon National Park',
  'Zion National Park',
  'Acadia National Park',
  'Glacier National Park',
  'Arches National Park',
  'Olympic National Park',
  'Rocky Mountain National Park',
  'Joshua Tree National Park',
];

const PREWARM_CATEGORIES = ['essentials','campgrounds','things_to_do','alerts','visitor_centers'];

async function prewarmCache() {
  console.log('Pre-warming cache for popular parks...');
  for (const parkName of POPULAR_PARKS) {
    for (const category of PREWARM_CATEGORIES) {
      try {
        if      (category === 'essentials')      await getEssentials(parkName);
        else if (category === 'campgrounds')     await getCampgroundsRaw(parkName);
        else if (category === 'things_to_do')    await getThingsToDo(parkName);
        else if (category === 'alerts')          await getAlerts(parkName);
        else if (category === 'visitor_centers') await getVisitorCentersRaw(parkName);
      } catch (err) {
        console.warn(`Pre-warm failed [${category}:${parkName}]:`, err.message);
      }
    }
  }
  console.log('Cache pre-warm complete.');
}

fetchParkData().then(() => prewarmCache());

// Refresh cache every 24 hours
setInterval(() => {
  console.log('Refreshing cache...');
  cache.clear();
  prewarmCache();
}, 24 * 60 * 60 * 1000);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const generateConversationId = () => Math.random().toString(36).substring(7);

async function getParkCode(parkName) {
  if (!fuse) return null;
  const results = fuse.search(parkName);
  if (results.length > 0) return results[0].item.parkCode;
  return null;
}

async function npsGet(endpoint, parkCode, extra = {}) {
  const { data } = await axios.get(`${NPS_BASE}${endpoint}`, {
    params: { api_key: process.env.NPS_API_KEY, parkCode, limit: 10, ...extra },
    timeout: 8000,
  });
  return data.data || [];
}

// ─── NPS API functions ────────────────────────────────────────────────────────

async function getParkHours(parkName) {
  const parkCode = await getParkCode(parkName);
  if (!parkCode) return `I couldn't find a park called "${parkName}". Please check the name and try again.`;
  const [park] = await npsGet('/parks', parkCode, { fields: 'operatingHours,fullName' });
  if (!park) return `No data found for ${parkName}.`;
  const hours = park.operatingHours?.[0]?.description;
  return hours
    ? `Operating hours for ${park.fullName}: ${hours}`
    : `Operating hours for ${park.fullName} are not available.`;
}

async function getParkInfo(parkName) {
  const parkCode = await getParkCode(parkName);
  if (!parkCode) return `I couldn't find a park called "${parkName}".`;
  const [park] = await npsGet('/parks', parkCode, { fields: 'description,fullName,states,url' });
  if (!park) return `No data found for ${parkName}.`;
  return `${park.fullName} (${park.states}): ${park.description} More info: ${park.url}`;
}

async function getEvents(parkName) {
  const parkCode = await getParkCode(parkName);
  if (!parkCode) return `I couldn't find a park called "${parkName}".`;
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const events = await npsGet('/events', parkCode, { limit: 10, dateStart: today });
  const future = events.filter(e => e.datestart >= today);
  if (future.length === 0) return `No upcoming events found for ${parkName}.`;
  return `Upcoming events at ${parkName}:\n` +
    future.map(e => `• ${e.title} — ${e.datestart}`).join('\n');
}

async function getPermits(parkName) {
  const parkCode = await getParkCode(parkName);
  if (!parkCode) return `I couldn't find a park called "${parkName}".`;
  const permits = await npsGet('/permits', parkCode);
  if (permits.length === 0) return `No permit information found for ${parkName} in the NPS database. Check Recreation.gov for reservation-based permits.`;
  return `Permits at ${parkName}:\n` + permits.map(p => `• ${p.title}: ${p.description || ''}`).join('\n');
}

async function getAlerts(parkName) {
  const cached = getCache('alerts', parkName);
  if (cached) return cached;
  const parkCode = await getParkCode(parkName);
  if (!parkCode) return { message: `I couldn't find a park called "${parkName}".`, data: null };
  const alerts = await npsGet('/alerts', parkCode, { limit: 50 });
  if (alerts.length === 0) return { message: `No current alerts for ${parkName}.`, data: null };
  const summary = alerts.map((a, i) =>
    `Alert ${i + 1}: ${a.title}\nCategory: ${a.category}\n${a.description}${a.url ? `\nMore: ${a.url}` : ''}`
  ).join('\n\n');
  const result = { message: `Current alerts for ${parkName}:\n\n${summary}`, data: alerts };
  setCache('alerts', parkName, result);
  return result;
}

async function getSpecificAlert(userMessage, conversationState) {
  if (!conversationState.alertsData) return "I don't have cached alert data. Please ask for alerts first.";
  const keywords = ['road closure', 'trail closure', 'flash flood', 'cyanobacteria', 'permit', 'parking', 'fire', 'flood'];
  const msg = userMessage.toLowerCase();
  const alertType = keywords.find(k => msg.includes(k));
  if (!alertType) return "Could you clarify which type of alert you're asking about?";
  const filtered = conversationState.alertsData.filter(a =>
    [a.title, a.description, a.category].some(f => f.toLowerCase().includes(alertType))
  );
  if (filtered.length === 0) return `No alerts related to "${alertType}" found for ${conversationState.confirmedParkName}.`;
  return filtered.map(a => `${a.title}\n${a.description}\n${a.url || ''}`).join('\n\n');
}

async function getCampgrounds(parkName) {
  const parkCode = await getParkCode(parkName);
  if (!parkCode) return `I couldn't find a park called "${parkName}".`;
  const camps = await npsGet('/campgrounds', parkCode, { limit: 8 });
  if (camps.length === 0) return `No campground data found for ${parkName}. Check Recreation.gov for reservations.`;
  return `Campgrounds at ${parkName}:\n` + camps.map(c =>
    `• ${c.name}: ${c.directionsOverview || ''} ${c.reservationInfo ? '| Reservations: ' + c.reservationInfo : ''}`
  ).join('\n');
}

async function getThingsToDo(parkName) {
  const cached = getCache('things_to_do', parkName);
  if (cached) return cached;
  const parkCode = await getParkCode(parkName);
  if (!parkCode) return `I couldn't find a park called "${parkName}".`;
  const things = await npsGet('/thingstodo', parkCode, { limit: 8 });
  if (things.length === 0) return `No activities found for ${parkName}.`;
  const result = `Things to do at ${parkName}:\n` + things.map(t =>
    `• ${t.title}${t.duration ? ' (' + t.duration + ')' : ''}${t.difficulty ? ' — ' + t.difficulty : ''}: ${t.shortDescription || ''}`
  ).join('\n');
  setCache('things_to_do', parkName, result);
  return result;
}

async function getFeesAndPasses(parkName) {
  const parkCode = await getParkCode(parkName);
  if (!parkCode) return `I couldn't find a park called "${parkName}".`;
  const fees = await npsGet('/feespasses', parkCode);
  if (fees.length === 0) return `No fee information found for ${parkName}.`;
  return `Fees & passes for ${parkName}:\n` + fees.map(f =>
    `• ${f.title}: $${f.cost} — ${f.description || ''}`
  ).join('\n');
}

async function getRoadConditions(parkName) {
  const parkCode = await getParkCode(parkName);
  if (!parkCode) return `I couldn't find a park called "${parkName}".`;
  const roads = await npsGet('/roadevents', parkCode, { limit: 10 });
  if (roads.length === 0) return `No road condition events reported for ${parkName} right now.`;
  return `Road conditions at ${parkName}:\n` + roads.map(r =>
    `• [${r.type}] ${r.title}: ${r.description || ''}`
  ).join('\n');
}

async function getWebcams(parkName) {
  const parkCode = await getParkCode(parkName);
  if (!parkCode) return `I couldn't find a park called "${parkName}".`;
  const cams = await npsGet('/webcams', parkCode);
  if (cams.length === 0) return `No webcams found for ${parkName}.`;
  return `Webcams at ${parkName}:\n` + cams.map(c =>
    `• ${c.title}${c.status ? ' (' + c.status + ')' : ''}${c.url ? ' — ' + c.url : ''}`
  ).join('\n');
}

async function getTripPlan(parkName, durationDays, month, groupSize) {
  const [infoRaw, campRaw, activitiesRaw, feesRaw] = await Promise.all([
    getParkInfo(parkName),
    getCampgrounds(parkName),
    getThingsToDo(parkName),
    getFeesAndPasses(parkName),
  ]);

  return [
    `=== PARK OVERVIEW ===\n${infoRaw}`,
    `=== CAMPGROUNDS ===\n${campRaw}`,
    `=== THINGS TO DO ===\n${activitiesRaw}`,
    `=== FEES & PASSES ===\n${feesRaw}`,
    `=== TRIP DETAILS ===\nDuration: ${durationDays || 'unspecified'} days | Month: ${month || 'unspecified'} | Group size: ${groupSize || 'unspecified'}`,
  ].join('\n\n');
}

// ─── Conversation state ───────────────────────────────────────────────────────

const conversationStates = {};

app.post('/api/chat', async (req, res) => {
  const { userMessage, conversationId } = req.body;
  const convoId = conversationId || generateConversationId();

  if (!conversationStates[convoId]) {
    conversationStates[convoId] = {
      stage: 'intent_recognition',
      intentData: null,
      alertsData: null,
      history: '',
      confirmedParkName: null,
    };
  }

  try {
    await processConversation(conversationStates[convoId], userMessage, convoId, res);
  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({
      botMessage: 'Something went wrong. Please try again.',
      conversationId: convoId,
    });
  }
});

// ─── Conversation processing ──────────────────────────────────────────────────

async function processConversation(state, userMessage, convoId, res) {
  state.history += `\nUser: "${userMessage}"`;

  // ── Stage 1: Intent recognition ──
  if (state.stage === 'intent_recognition') {
    const intentPrompt = `
You are an AI assistant that identifies user intents related to US National Parks.

Conversation history:
${state.history}

Focus on the user's most recent message. Extract and return the following as JSON (no extra text):

- "intent": one of:
  - "park_hours"      — user wants operating hours
  - "permits"         — user asks about permits
  - "events"          — user wants upcoming events
  - "alerts"          — user wants current alerts or closures
  - "specific_alert"  — user asks about a specific alert type
  - "general_info"    — user wants a general park overview
  - "campgrounds"     — user asks about camping or campgrounds
  - "things_to_do"    — user asks what to do, activities, hikes, attractions
  - "fees_passes"     — user asks about entry fees or passes
  - "road_conditions" — user asks about road closures or conditions
  - "webcams"         — user asks about live webcams or camera feeds
  - "trip_plan"       — user wants a full trip itinerary or plan

- "park_name": official NPS park name (if mentioned)
- "duration_days": number of days for the trip (for trip_plan, e.g. 3)
- "month": travel month if mentioned (e.g. "May")
- "group_size": number of people if mentioned
- "alert_type": specific alert type if intent is specific_alert
- "confirmation_message": a short, friendly message confirming what you understood
`;

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: intentPrompt }],
      max_tokens: 500,
      temperature: 0,
      response_format: { type: 'json_object' },
    });

    let intentData;
    try {
      intentData = JSON.parse(completion.choices[0].message.content.trim());
    } catch {
      throw new Error('Failed to parse intent JSON.');
    }

    state.intentData = intentData;

    if (intentData.park_name) {
      if (state.confirmedParkName && state.confirmedParkName !== intentData.park_name) {
        state.alertsData = null;
      }
      state.confirmedParkName = intentData.park_name;
    }

    state.stage = 'awaiting_confirmation';
    state.history += `\nAssistant: "${intentData.confirmation_message}"`;

    return res.json({ botMessage: intentData.confirmation_message, conversationId: convoId });
  }

  // ── Stage 2: Awaiting user confirmation ──
  if (state.stage === 'awaiting_confirmation') {
    const yes = ['yes', 'yeah', 'yep', 'yea', 'correct', 'sure', 'right', 'go ahead', 'ok', 'okay'];
    const no  = ['no', 'nope', 'incorrect', 'not really', 'wrong'];
    const lower = userMessage.toLowerCase().trim();

    if (yes.some(w => lower.includes(w))) {
      const { intent, duration_days, month, group_size } = state.intentData;
      const parkName = state.confirmedParkName;
      let raw = '';

      if      (intent === 'park_hours')      raw = await getParkHours(parkName);
      else if (intent === 'permits')         raw = await getPermits(parkName);
      else if (intent === 'events')          raw = await getEvents(parkName);
      else if (intent === 'general_info')    raw = await getParkInfo(parkName);
      else if (intent === 'campgrounds')     raw = await getCampgrounds(parkName);
      else if (intent === 'things_to_do')    raw = await getThingsToDo(parkName);
      else if (intent === 'fees_passes')     raw = await getFeesAndPasses(parkName);
      else if (intent === 'road_conditions') raw = await getRoadConditions(parkName);
      else if (intent === 'webcams')         raw = await getWebcams(parkName);
      else if (intent === 'trip_plan')       raw = await getTripPlan(parkName, duration_days, month, group_size);
      else if (intent === 'alerts') {
        const result = await getAlerts(parkName);
        raw = result.message;
        state.alertsData = result.data;
        if (!result.data) {
          state.stage = 'intent_recognition';
          state.intentData = null;
          state.history += `\nAssistant: "${raw}"`;
          return res.json({ botMessage: raw, conversationId: convoId });
        }
      } else if (intent === 'specific_alert') {
        raw = await getSpecificAlert(userMessage, state);
      } else {
        raw = "I don't have information on that topic yet.";
      }

      // GPT formats raw API data into a friendly response
      const formatPrompt = intent === 'trip_plan'
        ? `You are a knowledgeable national park trip planner. Using the data below, create a friendly, well-structured ${duration_days || 'multi'}-day itinerary for ${parkName}${month ? ' in ' + month : ''}${group_size ? ' for ' + group_size + ' people' : ''}. Suggest a day-by-day plan with activities, where to camp, and practical tips. Keep it warm and encouraging.\n\nData:\n${raw}`
        : `You are a helpful national park guide. Using the data below, write a concise, friendly response. Use bullet points where appropriate. Do not invent information not present in the data.\n\nData:\n${raw}`;

      const formatCompletion = await openai.chat.completions.create({
        model: MODEL,
        messages: [{ role: 'user', content: formatPrompt }],
        max_tokens: 900,
        temperature: 0.7,
      });

      const finalResponse = formatCompletion.choices[0].message.content.trim();

      state.stage = 'intent_recognition';
      state.intentData = null;
      state.history += `\nAssistant: "${finalResponse}"`;

      return res.json({ botMessage: finalResponse, conversationId: convoId });

    } else if (no.some(w => lower.includes(w))) {
      state.confirmedParkName = null;
      state.intentData = null;
      state.stage = 'intent_recognition';

      const msg = "My apologies — could you clarify which park or what you'd like to know?";
      state.history += `\nAssistant: "${msg}"`;
      return res.json({ botMessage: msg, conversationId: convoId });

    } else {
      // Treat as new request
      state.stage = 'intent_recognition';
      state.intentData = null;
      return processConversation(state, userMessage, convoId, res);
    }
  }
}

// ─── Structured data functions (return objects, not strings) ─────────────────

async function getEssentials(parkName) {
  const cached = getCache('essentials', parkName);
  if (cached) return cached;
  const parkCode = await getParkCode(parkName);
  if (!parkCode) return null;
  const [park] = await npsGet('/parks', parkCode, {
    fields: 'fullName,description,images,operatingHours,entranceFees,entrancePasses,weatherInfo,directionsInfo,states',
  });
  if (!park) return null;
  const result = {
    fullName:       park.fullName,
    description:    park.description,
    states:         park.states,
    weatherInfo:    park.weatherInfo,
    directionsInfo: park.directionsInfo,
    operatingHours: park.operatingHours  || [],
    entranceFees:   park.entranceFees    || [],
    entrancePasses: park.entrancePasses  || [],
    image:          park.images?.[0]     || null,
  };
  setCache('essentials', parkName, result);
  return result;
}

async function getCampgroundsRaw(parkName) {
  const cached = getCache('campgrounds', parkName);
  if (cached) return cached;
  const parkCode = await getParkCode(parkName);
  if (!parkCode) return [];
  const result = await npsGet('/campgrounds', parkCode, { limit: 10 });
  setCache('campgrounds', parkName, result);
  return result;
}

async function getVisitorCentersRaw(parkName) {
  const cached = getCache('visitor_centers', parkName);
  if (cached) return cached;
  const parkCode = await getParkCode(parkName);
  if (!parkCode) return [];
  const result = await npsGet('/visitorcenters', parkCode, { limit: 10 });
  setCache('visitor_centers', parkName, result);
  return result;
}

// ─── Structured query endpoints (no chatbot flow) ────────────────────────────

// Returns full park list for client-side search
app.get('/api/parks', (req, res) => {
  if (parkMapping.length === 0) return res.status(503).json({ error: 'Parks not loaded yet' });
  res.json(parkMapping);
});

// Returns park header data (image, description) for the park detail screen
app.post('/api/park-header', async (req, res) => {
  const { parkName } = req.body;
  if (!parkName) return res.status(400).json({ error: 'parkName required' });
  try {
    const data = await getEssentials(parkName);
    if (!data) return res.status(404).json({ error: 'Park not found' });
    res.json({ ok: true, park: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Direct query — takes parkName + category, returns { text, data }
// data is structured JSON for categories that need rich rendering; null otherwise
app.post('/api/query', async (req, res) => {
  const { parkName, category, tripParams = {} } = req.body;
  if (!parkName || !category) return res.status(400).json({ error: 'parkName and category are required' });

  try {
    let text = '';
    let data = null;

    if (category === 'essentials') {
      data = await getEssentials(parkName);
      text = data ? `Essentials for ${data.fullName}` : `No data found for ${parkName}.`;

    } else if (category === 'campgrounds') {
      data = await getCampgroundsRaw(parkName);
      text = data.length > 0 ? `Campgrounds at ${parkName}` : `No campground data found for ${parkName}.`;

    } else if (category === 'visitor_centers') {
      data = await getVisitorCentersRaw(parkName);
      text = data.length > 0 ? `Visitor centers at ${parkName}` : `No visitor center data found for ${parkName}.`;

    } else if (category === 'things_to_do')    { text = await getThingsToDo(parkName);
    } else if (category === 'alerts')          { text = (await getAlerts(parkName)).message;
    } else if (category === 'events')          { text = await getEvents(parkName);
    } else if (category === 'road_conditions') { text = await getRoadConditions(parkName);
    } else if (category === 'webcams')         { text = await getWebcams(parkName);

    } else if (category === 'trip_plan') {
      const { durationDays, month, groupSize } = tripParams;
      const raw = await getTripPlan(parkName, durationDays, month, groupSize);
      try {
        const completion = await openai.chat.completions.create({
          model: MODEL,
          messages: [{
            role: 'user',
            content: `You are a national park trip planner. Using the data below, create a friendly ${durationDays || 'multi'}-day itinerary for ${parkName}${month ? ' in ' + month : ''}${groupSize ? ' for ' + groupSize + ' people' : ''}. Write a day-by-day plan with activities, where to camp, fees to know, and practical tips. Keep it warm and actionable.\n\nData:\n${raw}`,
          }],
          max_tokens: 900,
          temperature: 0.7,
        });
        text = completion.choices[0].message.content.trim();
      } catch (aiErr) {
        console.warn('OpenAI unavailable for trip_plan, returning raw data:', aiErr.message);
        text = raw;
      }
    } else {
      return res.status(400).json({ error: 'Unknown category' });
    }

    res.json({ ok: true, text, data, parkName, category });
  } catch (err) {
    console.error('Query error:', err.message);
    res.status(500).json({ error: 'Failed to fetch data. Please try again.' });
  }
});

// ─── Start server ─────────────────────────────────────────────────────────────

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
