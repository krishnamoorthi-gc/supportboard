# SupportDesk — AI-Powered Customer Support Platform

> Full-stack SaaS: React 18 frontend (14,500+ lines) + Node.js backend (143 API endpoints, 49 SQLite tables, 23 AI touchpoints via Claude)

## Quick Start (No Docker)

### 1. Setup Backend

```bash
cd backend
npm install
```

Edit `.env` and add your Anthropic API key:
```
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

Start backend:
```bash
npm start
# or for dev with auto-reload:
npm run dev
```
→ Backend: http://localhost:3001

### 2. Setup Frontend

```bash
cd frontend
npm install
npm run dev
```
→ Frontend: http://localhost:5173

### 3. Login

**Demo credentials:**
- Email: `priya@supportdesk.app`
- Password: `demo123`
- 2FA: any 6+ digits (if prompted)

---

## Architecture

```
supportdesk/
├── frontend/               # React 18 + Vite + TypeScript
│   ├── src/
│   │   ├── App.tsx         # Full 14,500-line app (all 12 modules)
│   │   └── main.tsx        # Entry point
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
│
└── backend/                # Node.js + Express 5
    ├── server.js           # Main entry + all middleware
    ├── db.js               # 49-table SQLite schema + seed data
    ├── ws.js               # WebSocket (presence, chat, notifications)
    ├── .env                # ← Add your ANTHROPIC_API_KEY here
    ├── middleware/
    │   └── auth.js         # JWT verification
    ├── utils/
    │   └── helpers.js      # uid, paginate, etc.
    ├── data/               # SQLite DB stored here (auto-created)
    ├── uploads/            # File uploads stored here (auto-created)
    └── routes/
        ├── auth.js         # Login, 2FA, me, logout
        ├── dashboard.js    # KPIs, activity feed
        ├── conversations.js # CRUD + messages + merge
        ├── contacts.js     # Customer database
        ├── companies.js    # Company records
        ├── crm.js          # Deals, leads, tasks, meetings
        ├── chat.js         # Team chat channels + messages
        ├── marketing.js    # Campaigns, segments, templates
        ├── calendar.js     # Events CRUD
        ├── bookings.js     # Booking pages + bookings
        ├── kb.js           # Knowledge base articles
        ├── reports.js      # Analytics dashboards
        ├── settings.js     # 46 endpoints: agents, teams, labels, etc.
        └── ai.js           # Claude AI integrations (13 endpoints)
```

## Environment Variables

```env
# backend/.env
PORT=3001
JWT_SECRET=your-secret-here-change-in-production
CORS_ORIGIN=http://localhost:5173
ANTHROPIC_API_KEY=sk-ant-your-key-here    ← Required for AI features
DB_PATH=./data/supportdesk.db
```

## 12 Modules

| Module | Description |
|--------|-------------|
| **Home Dashboard** | KPIs, daily briefing, activity feed, quick actions |
| **Omnichannel Inbox** | 15+ channels, AI auto-reply, suggestions, sentiment, SLA |
| **Team Chat** | Channels, DMs, threads, reactions, 12 slash commands |
| **Live Monitor** | Real-time visitors, SVG world map, proactive chat |
| **Contacts** | Customer DB, custom fields, tags, merge, CSV export |
| **CRM** | Deals kanban, leads, tasks, meetings, AI deal advisor |
| **Calendar** | Month/week/day views, drag scheduling |
| **Marketing** | Campaigns, segments, AI copywriter, A/B testing |
| **Knowledge Base** | Articles, categories, AI generator, SEO |
| **Reports** | Conversations, agents, channels, SLA, CSAT |
| **Integrations** | 40+ tools, REST API, webhooks, API keys |
| **Settings** | 20 sub-tabs: inboxes, agents, AI bot, billing, themes |

## AI Features (23 Touchpoints)

All powered by Claude Sonnet 4 via your local `.env` key:

- Auto-reply suggestions in inbox
- Conversation summarization  
- Sentiment analysis
- Priority classification
- Daily briefing generation
- Deal advisor (CRM)
- Lead scoring
- Marketing copy generator
- KB article generator
- Visitor intent prediction
- Reports insights
- AI Sales Agent (multi-turn)
- AI Support Bot playground
- Churn risk scoring
- No-show prediction (bookings)
- Smart scheduling (calendar)
- Integration recommender
- Standup generator (team chat)
- Smart reply (team chat)
- Subject line generator
- A/B analyzer
- Anomaly detection (reports)
- Global AI Copilot

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite |
| Backend | Express 5, Node.js 18+ |
| Database | SQLite via better-sqlite3 (49 tables, 120+ seed rows) |
| Auth | JWT + bcrypt + 2FA |
| Real-time | WebSocket (ws) — presence, chat, notifications |
| AI | Claude Sonnet 4 (Anthropic API) |
| File Upload | Multer |

## Reset Database

To reset and re-seed:
```bash
cd backend
rm -f data/supportdesk.db
npm start  # auto-seeds on first run
```

## License

MIT
