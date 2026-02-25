# NPS Camping Chatbot — Project Tracker

## Overview
Conversational chatbot for National Parks info — hours, alerts, events, permits.
Full-stack: React frontend + Node.js/Express backend + OpenAI + NPS API.

---

## Tech Stack

| Layer | Tech | Version |
|-------|------|---------|
| Frontend | React (CRA) | ^18.3.1 |
| Backend | Express.js | ^4.21.1 |
| AI | OpenAI GPT-3.5-turbo | openai ^4.71.1 |
| HTTP | Axios | ^1.7.7 |
| Park search | Fuse.js (fuzzy matching) | — |
| Park data | NPS API v1 | — |

---

## Architecture

```
User → React Frontend (port 3000)
         ↓ POST /api/chat
       Express Backend (port 5001)
         ↓
       OpenAI GPT-3.5-turbo (intent recognition)
         ↓
       NPS API (park data fetch)
         ↓
       OpenAI GPT-3.5-turbo (response formatting)
         ↓
       User
```

**Conversation flow:**
1. User sends message
2. GPT extracts intent + park name (JSON)
3. Bot confirms intent with user
4. Backend calls NPS API endpoint
5. GPT formats raw data into readable reply
6. Conversation state held in-memory per session ID

**Supported intents:** `park_hours`, `permits`, `events`, `alerts`, `general_info`, `specific_alert`

---

## File Structure

```
camping-permits-chatbot/
├── backend/
│   ├── index.js          ← ACTIVE — full backend logic (541 lines)
│   ├── index 2.js        ← DEPRECATED — old skeleton (21 lines)
│   ├── .env              ← NPS_API_KEY, OPENAI_API_KEY, PORT=5001
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.js        ← ACTIVE — single ChatInterface component (116 lines)
│   │   ├── App.css       ← Basic chat UI styling (178 lines)
│   │   └── index.js      ← CRA entry point
│   ├── API.js            ← UNUSED
│   ├── API 2.js          ← UNUSED
│   ├── build/            ← Production build artifacts (deployed to EC2)
│   └── package.json
└── PROJECT.md            ← This file
```

---

## Known Issues

### Critical
- [ ] **API keys need rotation** — check if `.env` is in `.gitignore`
- [ ] **Frontend hardcoded to EC2 IP** (`http://54.234.93.73:5001/api/chat`) — EC2 likely spun down

### Functional
- [ ] **OpenAI key likely expired** — not actively used
- [ ] **NPS key status unknown** — free tier, may still work
- [ ] **Permits endpoint** — NPS API `/permits` is sparse, often returns nothing
- [ ] **In-memory sessions** — conversation state lost on server restart
- [ ] **CORS open to all origins** — fine for dev, restrict for prod

### Frontend / UX
- [ ] **Frontend needs a full redesign** — basic CRA with outdated CSS
- [ ] **Montserrat font referenced in CSS but never loaded** — falls back to sans-serif
- [ ] **No loading state polish**, no error boundaries
- [ ] **Example prompts are buttons that just fill input** — could be clickable queries

### Code Cleanup
- [ ] Remove `index 2.js` (deprecated)
- [ ] Remove `API.js` and `API 2.js` (unused)

---

## Deployment History
- Backend was deployed to AWS EC2 (`54.234.93.73`, port 5001) — likely stopped
- Frontend was built (`/frontend/build/`) and served from EC2
- No current active deployment

---

## Roadmap

### Phase 1 — Frontend Redesign (current)
- [ ] Migrate to Next.js 14 + Tailwind (or redesign in-place)
- [ ] Clean chat UI — message bubbles, typing indicator, better input
- [ ] Fix example prompts to fire immediately on click
- [ ] Add loading state while bot responds
- [ ] Make backend URL configurable via env var

### Phase 2 — Keys & Backend Fixes
- [ ] Rotate OpenAI API key, get new one
- [ ] Verify NPS API key still works
- [ ] Move hardcoded IP to `.env.local` / config
- [ ] Remove deprecated files

### Phase 3 — Feature Expansion (ideas)
- [ ] Trail condition lookups
- [ ] Campsite availability queries
- [ ] Recreation.gov permit link integration
- [ ] Map embed for park location
- [ ] Favorite parks / saved queries
- [ ] Deploy backend to Railway/Render (free tier, always-on)

---

## NPS API Notes
- Base URL: `https://developer.nps.gov/api/v1/`
- Endpoints in use: `/parks`, `/events`, `/permits`, `/alerts`
- Free API key available at: https://www.nps.gov/subjects/developer/get-involved.htm
- Park lookup at startup — fetches all parks, builds fuzzy-match index via Fuse.js

---

## OpenAI Notes
- Model: `gpt-3.5-turbo`
- 2 calls per query (intent recognition + response formatting)
- Consider upgrading to `gpt-4o-mini` — similar cost, much better quality
- Intent recognition uses temperature 0, response uses 0.7
