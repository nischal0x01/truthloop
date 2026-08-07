---
name: project-context
description: Understand the Mirror project — its purpose, architecture, data model, and build order. Read this before starting any work.
---

# Project Context — Mirror

Mirror is a gamified media literacy app for the UNESCO MIL Hackathon. It shows users their personal blind spots in identifying misinformation.

## The Core Idea

Users play a real-vs-fake quiz on news claims. After guessing, they see the verdict and explanation. After a week of playing, they get a **personalized weekly report** showing:
1. Their overall accuracy
2. Their specific blind spot (what category of claim fools them most)
3. One memorable replay of their most confident mistake

**The quiz mechanic is not the innovation.** Other apps do it. The weekly personalized report is what sets Mirror apart.

## Product Constraints

The hackathon is 24-48 hours. Do NOT build:
- Live news scraping
- Full RAG/web search pipeline
- Leaderboards, ranks, badges, streaks
- Multi-language support
- Mobile app
- User-submitted claims
- Social sharing

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React + Vite + TypeScript + Tailwind CSS v4 |
| Backend | Express + TypeScript |
| Auth + DB | Supabase (Postgres + Auth) |
| Styling | Tailwind CSS v4 with shadcn/ui components |
| Deployment | Vercel (frontend) + Railway/Render (backend) |

## Project Structure

```
unesco-hackathon/
├── app/                    # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/    # React components + shadcn/ui
│   │   ├── lib/           # Utilities
│   │   ├── App.tsx        # Root component
│   │   └── index.css      # Global styles + Tailwind
│   └── package.json
├── server/                 # Backend (Express)
│   ├── src/
│   │   ├── config/        # Environment config
│   │   ├── middleware/     # Express middleware
│   │   ├── routes/        # API routes
│   │   ├── utils/         # Utilities
│   │   └── index.ts       # Entry point
│   └── package.json
└── package.json            # Root workspace config
```

## Data Model

### Claim
```typescript
{
  id: string;
  text: string;           // The headline/claim
  verdict: 'real' | 'fake';
  category: string;       // e.g. "manipulated_stat", "out_of_context_quote"
  explanation: string;    // 2-3 sentences
  source_url: string;     // One authoritative source
}
```

### Guess
```typescript
{
  id: string;
  user_id: string;
  claim_id: string;
  user_answer: 'real' | 'fake';
  is_correct: boolean;
  timestamp: Date;
}
```

### User (from Supabase Auth)
```typescript
{
  id: string;             // Supabase user ID
  email: string;
  created_at: Date;
}
```

## Build Order

1. **Claim dataset** (15-20 hand-written claims with categories + sources)
2. **Static quiz flow** (no auth, hardcoded claims, guess → reveal loop)
3. **Supabase auth + persist guesses**
4. **Weekly report screen** (the hero feature)
5. **Polish pass**

Stop at any step and you still have a demoable product.

## Weekly Report Logic

```typescript
// Pseudocode for blind spot calculation
const wrongGuesses = guesses.filter(g => !g.is_correct);
const categoryCounts = wrongGuesses.groupBy(g => g.claim.category);
const blindSpot = categoryCounts.maxBy((cat, count) => count);
// → "You're most often fooled by misleading statistics"
```

## API Endpoints (current)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Health check |
| GET | `/api/health` | API health status |

## Key Files

| File | Purpose |
|---|---|
| `project_context.md` | Full project specification (you are here) |
| `app/src/App.tsx` | Main React app (currently just a placeholder) |
| `app/src/index.css` | Tailwind v4 theme + custom properties |
| `server/src/index.ts` | Express server entry point |
| `server/src/config/index.ts` | Environment configuration |

## For New Agents

Before starting any feature work:
1. Read `project_context.md` to understand the product
2. Read `app/src/index.css` to understand the current theme
3. Check Supabase is configured (env vars needed)
4. Don't build anything not in the Build Order above
