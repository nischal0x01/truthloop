# TruthLoop

> Gamified misinformation literacy platform for the **UNESCO MIL Hackathon** (AI + MIL category).

TruthLoop challenges users to spot real vs. fake claims, discuss them in threaded discussions, and build media literacy through personalized weekly reports that reveal their individual blind spots.

---

## 🎯 What It Does

- **Vote on Claims** — Pre-verified real/fake claims with a locked vote and instant verdict reveal
- **Discuss** — Reddit-style nested comment threads on every claim
- **Scam Forecast** — AI-generated daily predictions of trending scam types
- **Blind-Spot Report** — Personalized weekly report showing which misinformation categories fool you specifically
- **Gamification** — Points, 8 badges, daily & all-time leaderboards

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite 6 + Tailwind v4 + shadcn/ui + TanStack Query + React Router 6 |
| Backend | Express + TypeScript + PostgreSQL + Passport (Google OAuth) |
| AI | Anthropic Claude (sonnet-4-5 default, opus-4-1 for deep reasoning) |
| Email | Resend + React Email |
| Real-time | Server-Sent Events (SSE) |

---

## 📁 Project Structure

```
unesco-hackathon/
├── app/                          # React frontend (Vite)
│   ├── src/
│   │   ├── components/           # UI components + shadcn/ui
│   │   ├── pages/               # Route pages
│   │   ├── lib/                 # Utilities, API client, query hooks
│   │   └── App.tsx              # Root component
│   └── Design.md                # Gumroad design system source
│
├── server/                       # Express backend
│   └── src/
│       ├── routes/              # API endpoints
│       ├── middleware/          # Auth, error handling, validation
│       ├── services/            # Business logic (claims, users, AI)
│       ├── jobs/                # Cron jobs (claim harvester)
│       └── db/                   # Schema + seed data
│
├── .ai/                          # Full project specification
│   ├── 01-overview.md
│   ├── 02-business-logic.md
│   ├── 03-system-architecture.md
│   ├── 04-data-model.md
│   ├── 05-ai-prompts.md
│   ├── 06-roadmap.md
│   └── 07-design-tokens.md
│
└── CLAUDE.md                     # Project memory & locked decisions
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database
- Anthropic API key
- Google OAuth credentials

### Installation

```bash
# Install all workspace dependencies
npm install

# Set up environment variables
cd server
cp .env.example .env
# Edit server/.env with your credentials
```

### Development

```bash
# Run both frontend and backend concurrently
npm run dev

# Run individually
npm run dev:app       # http://localhost:5173
npm run dev:server    # http://localhost:3000
```

### Build

```bash
npm run build
```

---

## 🔑 Key Features

### Voting Loop
Users sign in via Google OAuth, browse pre-verified claims, cast a locked vote (real/fake), and instantly see the verified answer with source citations.

### Weekly Blind-Spot Report
AI analyzes your voting history to identify the *specific types* of misinformation that fool you — then explains why those scams work on people like you.

### Scam Forecast
Daily AI-generated forecast of which scam types will trend, generated fresh each day via Claude Sonnet.

### Gamification
- **Points** — earned per vote, comment, and report
- **8 Badges** — First Vote, Skeptic, Debunker, etc.
- **Daily + All-time Leaderboards** — ranked by points

---

## 📝 Documentation

| Doc | Purpose |
|---|---|
| [CLAUDE.md](CLAUDE.md) | Project memory, locked decisions, conventions |
| [.ai/01-overview.md](.ai/01-overview.md) | Vision, scope, non-negotiables |
| [.ai/02-business-logic.md](.ai/02-business-logic.md) | Feature rules, edge cases |
| [.ai/03-system-architecture.md](.ai/03-system-architecture.md) | Services, APIs, SSE, deployment |
| [.ai/04-data-model.md](.ai/04-data-model.md) | Postgres schema (10 tables) |
| [.ai/05-ai-prompts.md](.ai/05-ai-prompts.md) | All Claude prompt templates |
| [.ai/06-roadmap.md](.ai/06-roadmap.md) | Build plan, demo script |
| [.ai/07-design-tokens.md](.ai/07-design-tokens.md) | Gumroad → Tailwind v4 design tokens |
| [app/Design.md](app/Design.md) | Gumroad design system extraction |

---

## 🛡️ Security

- Google OAuth only (no password auth)
- Zod validation on all request/response payloads
- Prompt injection guards (`<user_input>` wrapping)
- Helmet.js security headers
- CORS configured for frontend origin

---

## 🙏 Acknowledgments

Built for the **UNESCO MIL Hackathon** (48-hour build, AI + MIL category).
