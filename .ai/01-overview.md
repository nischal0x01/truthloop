# 01 — Product Overview

> A living spec. Every section here is the source of truth for what the team is building.
> Locked decisions from the kickoff are marked with **🔒 DECIDED**. Open items are marked **❓ OPEN**.

---

## 1. One-line pitch

**TruthLoop** is a gamified misinformation literacy platform where users vote real-vs-fake on trending claims, get an AI-verified verdict, discuss them in nested threads, receive AI-generated scam forecasts and personalized weekly blind-spot reports — all wrapped in a Gumroad-style bold, high-contrast UI.

> **UNESCO MIL Hackathon** · AI and MIL category · 48-hour build

---

## 2. What this product actually is (vs. the original minimal spec)

The original `project_context.md` defined a **minimalist single-player quiz** with a weekly blind-spot report as the hero feature. The user has explicitly expanded the scope into a **multi-feature social platform** with these additions:

| Original (TruthLoop v1) | Expanded (TruthLoop v2 — what we're building) |
| --- | --- |
| Single-player real-vs-fake quiz | Pre-verified claims **+** user-submitted claims with live AI fact-check |
| Weekly blind-spot report | Weekly report **+** daily + all-time leaderboards **+** badges **+** points |
| (none) | AI-generated daily "Scam Forecast" card |
| (none) | Reddit-style nested comment threads |
| (none) | User-configurable email alerts (Resend) |
| (none) | Live updates via Server-Sent Events |

> ⚠️ This is a 48-hour build, not 6 months. Section 6 below lists what is **cut** to keep the demo bulletproof.

---

## 3. Locked decisions (kickoff answers)

### 🔒 Product scope
- **Voting unit**: Pre-verified claims (TruthLoop-style) — hand-curated, real/fake verdict known
- **Submission flow**: Pre-verified feed + a separate "Submit a claim" tab where users paste a headline and get a **live AI fact-check** verdict
- **Scam prediction**: AI-generated "Scam Forecast" card (daily) — Claude writes 1–3 forecast items in scam categories, users can vote "I believe this"
- **Alerts**: User-configurable email via Resend — daily digest **and/or** instant-on-high-severity
- **Discussions**: Reddit-style nested comment threads, with AI toxicity moderation on every new comment

### 🔒 Business logic
- **Gamification**: Points per correct guess **+** Badges **+** Daily leaderboard (with All-time tab)
- **Voting rules**: One vote per user, **locked** after submission
- **Auth**: Google OAuth (one-tap sign-in, no password to manage)

### 🔒 Tech stack
- **Frontend**: React 19 + Vite + Tailwind v4 + shadcn/ui (already scaffolded in `app/`)
- **Backend**: Express + TypeScript + PostgreSQL (already scaffolded in `server/`)
- **AI**: Anthropic Claude API — `claude-sonnet-4-5` for most tasks, `claude-opus-4-1` for deep reasoning (live fact-check, blind-spot narrative)
- **Email**: Resend + React Email templates
- **OAuth**: Google via `passport-google-oauth20` (or `@auth/express` for newer API)
- **Real-time**: Server-Sent Events (SSE) for live comments, vote tallies, alert toasts
- **Hosting**: Vercel (frontend) + Railway/Render (backend + Postgres)

### 🔒 Design
- **System**: Gumroad (full token spec in `app/Design.md` and `.ai/07-design-tokens.md`)
- **Primary theme**: Light (off-white `#f4f4f0` surface, near-black text, hot-pink `#ff90e8` accent)
- **Typography**: ABC Favorit (use Inter as free fallback if the license is unavailable)
- **Elevation**: Flat — 1px borders + offset-shadow utility, no box-shadows

### 🔒 Demo & content
- **Demo seed**: Heavy — 20 claims, 50 fake users, 200+ votes, 30+ comments, 5 unread alerts, populated leaderboards, a full 7-day-old weekly report for the demo account
- **Content focus**: Global, English-primary

### 🔒 Timeline
- **48 hours** (weekend hackathon)

---

## 4. Target users (for the pitch)

1. **Primary**: News-literate 18–35 year-olds in South Asia + global English-speaking millennials/Gen-Z who are skeptical of social media but don't know *which* kinds of misinformation fool *them* specifically
2. **Secondary**: Educators, journalists, MIL trainers (the personalized blind-spot format is what makes this useful for them)
3. **Tertiary**: NGOs and fact-checking orgs (the AI scam-forecast feature is a unique differentiator)

---

## 5. Core user journeys (top 3 for the demo)

### Journey A — The Voting Loop (the heart of the product)
```
1. User lands on home → see "Today's Trending Claims" feed
2. Tap a claim card → see full claim text (no verdict)
3. Choose "Real" or "Fake" → verdict revealed with explanation + source
4. Optional: leave a comment, reply to others, react
5. Move to next claim (or return to feed)
6. See running points + rank update
```

### Journey B — The Scam Forecast
```
1. User opens Scam Forecast tab → see 1–3 AI-predicted scam patterns for today
2. Each card has a "I believe this" / "Don't buy it" vote
3. Vote tallies visible live (SSE)
4. Optional: subscribe to email alerts for new forecasts
```

### Journey C — The Weekly Blind-Spot Report
```
1. After 7 days of voting, user gets an email + notification
2. Opens report → 3 sections: accuracy, blind spot (one sentence), one replay claim
3. Can re-generate on-demand anytime
```

---

## 6. What is **out of scope** (the cuts)

These exist in the original context or were tempting — explicitly cut to protect demo reliability:

- ❌ Multi-language (English only)
- ❌ Native mobile app (responsive web only)
- ❌ User-submitted claims going into the **main** feed (submission tab only)
- ❌ Custom badge creation / community-designed content
- ❌ Direct messages between users
- ❌ Video content / image-upload fact-checking (text + URLs only for MVP)
- ❌ Real-time push notifications (web push, native push) — only in-app SSE + email
- ❌ Multi-week history comparison (single weekly report only)
- ❌ Admin dashboard for moderation (basic SQL seed scripts instead)
- ❌ Stripe / paid tiers / subscriptions

---

## 7. What is **in scope but later** (v2 candidates — for the pitch "roadmap" slide)

- Live news ingestion (RSS, Twitter, etc.) + automated claim extraction
- Verified-organization accounts (newsrooms, fact-checkers)
- Classroom mode (educator creates a class, assigns claims, sees student reports)
- Mobile app (React Native)
- Multi-language with localized AI prompts
- Public API for fact-checkers to publish their verdicts directly

---

## 8. Document map

This folder contains the full business spec. Read in this order:

1. **`01-overview.md`** ← you are here
2. **`02-business-logic.md`** — every feature in detail, with rules, edge cases, and acceptance criteria
3. **`03-system-architecture.md`** — service diagram, request flows, SSE design, deployment
4. **`04-data-model.md`** — full Postgres schema (extends the existing `claims`/`guesses` tables)
5. **`05-ai-prompts.md`** — every Claude prompt template, with input/output contracts
6. **`06-roadmap.md`** — hour-by-hour 48-hour build plan, milestones, demo script
7. **`07-design-tokens.md`** — Gumroad design tokens → Tailwind config + CSS variables
