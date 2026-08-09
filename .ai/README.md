# `.ai/` — Business Logic & Engineering Specs

> Source of truth for what we're building, why, and how.
> Read in order. Each doc builds on the last.

## The product

**TruthLoop** — a gamified misinformation literacy platform for the UNESCO MIL Hackathon. Users vote real-vs-fake on trending claims, discuss them in nested threads, get an AI-generated daily scam forecast, and receive a personalized weekly blind-spot report that shows the *specific* type of misinformation that fools *them*.

The original minimal spec lives in [`../project_context.md`](../project_context.md). **This folder is the expanded spec** — the user has explicitly broadened the scope into a multi-feature social platform. Every "🔒 DECIDED" item below was confirmed during the kickoff.

## Docs (read in order)

1. [**01 — Product Overview**](./01-overview.md) · vision, locked decisions, what is in / out of scope, top 3 user journeys
2. [**02 — Business Logic**](./02-business-logic.md) · every feature, every rule, every edge case, acceptance criteria
3. [**03 — System Architecture**](./03-system-architecture.md) · service diagram, request flows, SSE design, deployment, failure modes
4. [**04 — Data Model**](./04-data-model.md) · full Postgres schema (10 tables), query patterns, seed plan
5. [**05 — AI Prompts**](./05-ai-prompts.md) · every Claude prompt template with Zod schemas and fallbacks
6. [**06 — Roadmap**](./06-roadmap.md) · hour-by-hour 48-hour build plan, demo script, judge Q&A, cut order
7. [**07 — Design Tokens**](./07-design-tokens.md) · Gumroad tokens → Tailwind v4 config, component recipes, color usage

## Locked decisions at a glance

| Area | Decision |
| --- | --- |
| Voting unit | Pre-verified claims + a "Submit a claim" tab with live AI fact-check |
| Scam prediction | AI-generated daily "Scam Forecast" card (claude-sonnet-4-5) |
| Alerts | User-configurable email via Resend (digest + instant on high-severity) |
| Discussions | Reddit-style nested comments with AI toxicity moderation |
| Gamification | Points per correct + 8 Badges + Daily + All-time leaderboards |
| Voting rules | One vote per user, locked |
| Auth | Google OAuth |
| AI provider | Claude (Anthropic) — sonnet-4-5 default, opus-4-1 for deep reasoning |
| Email | Resend + React Email |
| Theme | Light (off-white) primary, Gumroad design system |
| Real-time | Server-Sent Events (SSE) |
| Demo seed | Heavy — every page pre-populated |
| Content focus | Global, English-primary |
| Timeline | 48 hours |

## Non-negotiables (do not cut)

1. **Voting loop** — sign in, see claim, vote, see verdict
2. **Weekly blind-spot report** — pre-seeded for the demo account, this is the pitch moment
3. **Scam Forecast page** — at least 1 AI-generated item visible
4. **Comments** — at least 1 level of nesting
5. **Leaderboard** — at least the daily tab
6. **Gumroad design polish** — judges remember visuals

If you have to cut, cut in this order (from [06-roadmap.md](./06-roadmap.md#7-if-youre-running-out-of-time-cut-in-this-order)): Submit tab → Email → SSE → Full Reddit nesting → All-time leaderboard → Some badges → Weekly report on-demand regen.

## Pointers to other docs in the repo

- [`../project_context.md`](../project_context.md) — original minimal TruthLoop spec (kept for reference)
- [`../README.md`](../README.md) — fullstack starter-kit boilerplate (React + Vite + Express)
- [`../app/Design.md`](../app/Design.md) — full Gumroad design system extraction (source of truth for visual design)
- [`../server/src/db/schema.sql`](../server/src/db/schema.sql) — current DB schema (extends per `04-data-model.md`)
- [`../server/src/routes/claims.ts`](../server/src/routes/claims.ts) — current claims + weekly report endpoints

## Open questions (if any)

None as of writing. If the team adds new questions during the build, capture them at the top of `02-business-logic.md` under a new "Open Questions" section.
