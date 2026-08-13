# CLAUDE.md

> Project memory for Claude. Read this first. Full specs live in `.ai/`.

---

## What this project is

**TruthLoop** — gamified misinformation literacy platform for the **UNESCO MIL Hackathon** (48-hour build, AI + MIL category).

Users vote real-vs-fake on trending claims, discuss them in nested threads, get an AI-generated daily scam forecast, and receive a personalized weekly blind-spot report showing the _specific_ type of misinformation that fools _them_.

---

## The full spec lives in `.ai/` — read these in order

1. [`.ai/01-overview.md`](.ai/01-overview.md) — vision, locked decisions, in/out of scope
2. [`.ai/02-business-logic.md`](.ai/02-business-logic.md) — every feature, rule, edge case
3. [`.ai/03-system-architecture.md`](.ai/03-system-architecture.md) — services, APIs, SSE, deployment
4. [`.ai/04-data-model.md`](.ai/04-data-model.md) — Postgres schema (10 tables)
5. [`.ai/05-ai-prompts.md`](.ai/05-ai-prompts.md) — all Claude prompt templates
6. [`.ai/06-roadmap.md`](.ai/06-roadmap.md) — 48-hour build plan, demo script, judge Q&A
7. [`.ai/07-design-tokens.md`](.ai/07-design-tokens.md) — Gumroad design system → Tailwind v4

Other project docs:

- [`project_context.md`](project_context.md) — original minimalist spec (kept for reference; the user has expanded scope)
- [`app/Design.md`](app/Design.md) — full Gumroad design system extraction (visual source of truth)
- [`README.md`](README.md) — fullstack starter-kit boilerplate (React + Vite + Express)

> **Build status** is tracked in [`.ai/06-roadmap.md` §0](.ai/06-roadmap.md) (Quick status table) and §9 (Next-up priority queue). Read both before starting new work to avoid duplicating or contradicting what's already shipped.

---

## Locked decisions (do not re-ask)

| Area            | Decision                                                                   |
| --------------- | -------------------------------------------------------------------------- |
| Voting unit     | Pre-verified claims + a "Submit a claim" tab with **live AI fact-check**   |
| Scam prediction | AI-generated daily **Scam Forecast** card (claude-sonnet-4-5)              |
| Alerts          | User-configurable email via **Resend** (digest + instant on high-severity) |
| Discussions     | **Reddit-style nested comments** with AI toxicity moderation               |
| Gamification    | Points + **8 Badges** + **Daily** + All-time leaderboards                  |
| Voting rules    | One vote per user, **locked**                                              |
| Auth            | **Google OAuth** (no password)                                             |
| AI provider     | **Claude (Anthropic)** — sonnet-4-5 default, opus-4-1 for deep reasoning   |
| Email           | Resend + React Email                                                       |
| Theme           | **Light** (off-white) primary, Gumroad design system                       |
| Real-time       | **Server-Sent Events (SSE)**                                               |
| Demo seed       | **Heavy** — every page pre-populated for the demo account                  |
| Content focus   | Global, English-primary                                                    |
| Timeline        | 48 hours (weekend)                                                         |

---

## Non-negotiables (cut in this order if time is short)

1. ~~Submit tab + live fact-check~~
2. ~~Email integration~~
3. ~~SSE real-time~~ → polling fallback
4. ~~Full Reddit-style comments~~ → 1-level only
5. ~~All-time leaderboard tab~~ → daily only
6. ~~Some badges~~ → keep 4 of 8
7. ~~Weekly report on-demand regen~~

**Never cut** (in order):

1. Voting loop (sign in, see claim, vote, see verdict)
2. Weekly blind-spot report (pre-seeded for demo account — this is the pitch)
3. Scam Forecast page (≥1 AI-generated item)
4. Comments (≥1 level of nesting)
5. Leaderboard (≥ daily)
6. Gumroad design polish (judges remember visuals)

---

## Project conventions

### Tech stack (already scaffolded)

- **Frontend** (`app/`): React 19 + Vite 6 + Tailwind v4 + shadcn/ui + TanStack Query + React Router 6 + lucide-react
- **Backend** (`server/`): Express + TypeScript + PostgreSQL (via `pg`) + Passport + Zod
- **AI**: `@anthropic-ai/sdk` (claude-sonnet-4-5 default, claude-opus-4-1 for fact-check + narrative)
- **Email**: `resend` + `@react-email/components`
- **Real-time**: native `EventSource` on frontend, in-process `EventEmitter` on backend
- **Auth**: `passport-google-oauth20`

### Code conventions

- **Path alias**: `@/*` → `src/*` in both `app/` and `server/`
- **TypeScript strict** in both workspaces
- **Commits**: Conventional Commits (enforced by commitlint + husky)
- **Validation**: Zod on every request body / query / response
- **Errors**: `throw new AppError(status, message)` — caught by global `errorHandler`
- **DB access**: import `query` from `@/db` (re-exported from `@/utils/db`)

### File layout

```
.
├── CLAUDE.md                    ← you are here
├── README.md                    ← starter-kit boilerplate
├── project_context.md           ← original minimal spec
├── .ai/                         ← full business + engineering spec
│   ├── README.md
│   ├── 01-overview.md
│   ├── 02-business-logic.md
│   ├── 03-system-architecture.md
│   ├── 04-data-model.md
│   ├── 05-ai-prompts.md
│   ├── 06-roadmap.md
│   └── 07-design-tokens.md
├── app/
│   ├── Design.md                ← Gumroad design system (source of truth)
│   └── src/                     ← React app
└── server/
    └── src/
        ├── db/schema.sql        ← (existing) claims + guesses
        ├── routes/claims.ts     ← (existing) voting + weekly report endpoints
        └── ...                  ← extend per .ai/04-data-model.md
```

---

## Commands

```bash
# Install (workspaces)
npm install

# Dev (both frontend + backend)
npm run dev

# Dev individually
npm run dev:app       # http://localhost:5173
npm run dev:server    # http://localhost:3000

# Build
npm run build

# Lint + format
npm run lint
npm run format
```

---

## Gotchas (specific to this project)

- **SSE doesn't work on Vercel serverless** — backend must be on Railway / Render / Fly / VPS for SSE to function.
- **ABC Favorit is a paid font** — fall back to **Inter** (free, via `@fontsource/inter`) if no license. Spec uses Inter as the fallback in the font stack already.
- **No `box-shadow`** anywhere — depth comes from 1px black borders + the `.shadow-hard*` offset-shadow utilities only. See [`.ai/07-design-tokens.md`](.ai/07-design-tokens.md) §2.
- **Heavy demo seed is mandatory** — every page must look populated on cold load. See [`.ai/04-data-model.md`](.ai/04-data-model.md) §4 for the seed plan.
- **Prompt injection guard** — every Claude prompt wraps user content in `<user_input>...</user_input>` tags and explicitly tells Claude to treat it as data, not instructions.
- **One vote per user, locked** — `UNIQUE (user_id, claim_id)` constraint on the `guesses` table. Don't change.
- **AI fallback responses** are documented per prompt in [`.ai/05-ai-prompts.md`](.ai/05-ai-prompts.md) §6. Always handle the case where Claude is down or returns invalid JSON.
- **Demo account** is the seeded `users` row with `is_admin = true`, `email = demo@truthloop.app`. Pre-seed everything for this user (badges, weekly report, points, notifications).

---

## When you make changes

- **Schema changes**: append to `server/src/db/schema.sql` (idempotent — uses `IF NOT EXISTS` / `CREATE OR REPLACE`)
- **New API routes**: add to `server/src/routes/`, register in `server/src/routes/index.ts`
- **New screens**: add to `app/src/`, follow the route map in [`.ai/03-system-architecture.md`](.ai/03-system-architecture.md) §2.2
- **New components**: use the design tokens from [`.ai/07-design-tokens.md`](.ai/07-design-tokens.md) — never introduce new colors or shadow styles
- **New AI features**: add prompt template to `server/src/ai/prompts/`, Zod schema to `server/src/ai/schemas.ts`, document in [`.ai/05-ai-prompts.md`](.ai/05-ai-prompts.md)

---

## Open questions

None. If new questions come up during the build, add them to [`.ai/02-business-logic.md`](.ai/02-business-logic.md) under a new "Open Questions" section.
