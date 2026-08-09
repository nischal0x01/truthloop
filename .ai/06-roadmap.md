# 06 — Roadmap & 48-Hour Build Plan

> The hour-by-hour plan. The team should be able to read this and know exactly what to do at 3:47am Sunday.

---

## 1. Team allocation (assumes 3 people, adjust as needed)

| Role | Owner | Responsibilities |
| --- | --- | --- |
| **Backend lead** | Person 1 | DB schema, all API routes, AI prompts, scheduled jobs, SSE, email |
| **Frontend lead** | Person 2 | React app, all UI screens, design tokens, SSE consumer |
| **Full-stack / integrations** | Person 3 | OAuth setup, Resend, deployment, seed data, demo prep |

If 2 people: merge "full-stack/integrations" into backend, frontend focuses only on screens.
If 4+ people: split frontend into "core screens" and "polish".

---

## 2. Pre-build checklist (T-2 hours, before the timer starts)

These are done BEFORE the 48h clock starts. They are the highest-leverage prep.

- [ ] **Finalize project name** (currently "TruthLoop" / "Mirror")
- [ ] **Write 20 claims** by hand with category + 2-3 sentence explanation + source URL. Save in `server/src/db/seed-claims.json`.
- [ ] **Set up Google Cloud project** + OAuth credentials (this takes 20 min the first time, do it before)
- [ ] **Set up Anthropic API key** + Resend account + domain (or use Resend's `onboarding@resend.dev` for dev)
- [ ] **Provision Railway project** + Postgres database
- [ ] **Decide team roles** per table above
- [ ] **Share `.ai/` docs** with the whole team — everyone reads all 5 docs before starting

---

## 3. 48-hour timeline

### Hour 0–2: Foundation

**Goal**: Repo ready, design system in place, DB running.

- [ ] Pull latest, `npm install` in root
- [ ] **Backend**: extend `schema.sql` with all 10 new tables, run on Railway Postgres
- [ ] **Backend**: set up env vars in Railway
- [ ] **Frontend**: configure Tailwind v4 with Gumroad design tokens (`.ai/07-design-tokens.md`)
- [ ] **Frontend**: install React Router, TanStack Query, lucide-react
- [ ] **Both**: agree on TypeScript types for `Claim`, `Guess`, `Comment`, `User`, etc. in `shared/types.ts`

**Demo gate**: App shows "Hello World" on Vercel preview + `GET /api/health` returns ok.

### Hour 2–6: Core voting loop (the heart of the product)

- [ ] **Backend**: `GET /api/claims` (list, filterable) + `GET /api/claims/:id` + `POST /api/claims/:id/guess`
- [ ] **Backend**: Google OAuth + JWT cookie + `GET /api/auth/me`
- [ ] **Frontend**: `App.tsx` → Router + Layout + TopNav
- [ ] **Frontend**: `ClaimCard` + `ClaimDetail` screens, vote flow
- [ ] **Frontend**: wire to backend, optimistic vote

**Demo gate**: Sign in with Google, see claims, vote, see verdict + explanation.

### Hour 6–10: Comments + AI toxicity

- [ ] **Backend**: `GET/POST /api/claims/:id/comments` (with AI toxicity filter)
- [ ] **Backend**: AI client wrapper + toxicity prompt (`.ai/05-ai-prompts.md` §3)
- [ ] **Frontend**: `CommentThread` (1-level nesting for v1 to keep SQL simple — extend to full Reddit tree in hour 30-32)
- [ ] **Frontend**: comment composer with optimistic submit

**Demo gate**: Post a comment, see it appear with the right tone. Post a slur, get a 403.

### Hour 10–14: Gamification (points, badges, leaderboard)

- [ ] **Backend**: increment `users.points` on correct guess (trigger or app-level)
- [ ] **Backend**: badge trigger logic (`first-guess`, `truth-teller`, `on-a-roll`)
- [ ] **Backend**: `GET /api/leaderboard?scope=daily|all-time`
- [ ] **Frontend**: points display in TopNav, animated +1 on correct
- [ ] **Frontend**: badge toast + `/profile` page with badge grid
- [ ] **Frontend**: `/leaderboard` page with Daily/All-time tabs

**Demo gate**: Vote correctly 3 times, see the coin count rise, see "First Guess" badge animate in.

### Hour 14–18: Scam Forecast (the differentiator)

- [ ] **Backend**: AI scam forecast prompt (`.ai/05-ai-prompts.md` §1)
- [ ] **Backend**: `GET /api/forecast/today` + `POST /api/forecast/:id/vote`
- [ ] **Backend**: cron job at 06:00 UTC (use `node-cron`, manual trigger for demo)
- [ ] **Frontend**: `/forecast` page with severity-colored cards + vote buttons
- [ ] **Frontend**: live vote tally (via polling for now, SSE in hour 26)

**Demo gate**: `/forecast` shows today's forecast, vote on an item, see tally update.

### Hour 18–22: Submit + Live AI Fact-Check

- [ ] **Backend**: `POST /api/submissions` with `claude-opus-4-1` fact-check prompt
- [ ] **Backend**: `GET /api/submissions/me`
- [ ] **Frontend**: `/submit` page with text input + loading state
- [ ] **Frontend**: result display (verdict + confidence + explanation + sources)

**Demo gate**: Paste a known fake headline, see the AI catch it in <3s.

### Hour 22–26: Weekly Report

- [ ] **Backend**: weekly report generation prompt (`.ai/05-ai-prompts.md` §4)
- [ ] **Backend**: Sunday cron + `GET /api/reports/weekly` + `POST /api/reports/weekly/regenerate`
- [ ] **Frontend**: `/reports/weekly` page — 3 sections (accuracy, blind spot, replay)
- [ ] **Frontend**: regenerate button

**Demo gate**: Demo account's report is populated, shows 12/16 accuracy, a real narrative, a replay claim.

### Hour 26–30: Real-time + Notifications + Email

- [ ] **Backend**: SSE broadcaster (`.ai/03-system-architecture.md` §3.6)
- [ ] **Backend**: `GET /api/sse/connect`
- [ ] **Backend**: notification triggers on every event
- [ ] **Backend**: Resend email integration + React Email template
- [ ] **Backend**: daily digest cron (manual trigger for demo)
- [ ] **Frontend**: `useSSE` hook + `<Bell>` + notification dropdown
- [ ] **Frontend**: live comment updates on claim page
- [ ] **Frontend**: settings page for email preferences

**Demo gate**: Open two browser tabs, post a comment in one, see it in the other within 2s. Bell shows unread count.

### Hour 30–34: Polish & Integration

- [ ] **Frontend**: full Reddit-style nested comments (extend from 1-level)
- [ ] **Frontend**: leaderboard live updates via SSE
- [ ] **Frontend**: empty states, loading skeletons, error states everywhere
- [ ] **Frontend**: animation pass (use `impeccable:animate` skill or framer-motion)
- [ ] **Frontend**: responsive pass (mobile + tablet, even though primary is desktop)

### Hour 34–38: Demo data + Seed

- [ ] **Backend**: write `seed.sql` with 50 users, 200+ guesses, 30+ comments, 5 alerts, 1 weekly report
- [ ] **Backend**: generate 2-3 days of scam forecasts
- [ ] **Frontend**: empty-state copy, demo account banner
- [ ] **Verify**: every page in the app shows populated data for the demo account

**Demo gate**: Cold load the app on the demo account → everything looks alive.

### Hour 38–42: Deploy & Smoke Test

- [ ] **Backend**: deploy to Railway, run migrations + seed
- [ ] **Frontend**: deploy to Vercel, set `VITE_API_URL`
- [ ] **Both**: run through every demo script step in `.ai/06-roadmap.md` §5
- [ ] **Both**: test on 2 different devices (laptop + phone)
- [ ] **Both**: open DevTools, check no console errors, no 4xx/5xx in network
- [ ] **Both**: test SSE by opening 2 tabs
- [ ] **Both**: send a test email via Resend, verify it lands

### Hour 42–46: Pitch Prep

- [ ] **Write 60-90s pitch** (see §4 below)
- [ ] **Record a 30s backup video** of the demo in case the live demo fails
- [ ] **Prepare answers** to expected judge questions (see §6)
- [ ] **Print/queue slides** if any
- [ ] **Sleep at least 4 hours**. This is non-negotiable.

### Hour 46–48: Final buffer

- [ ] Fix any last-minute bugs
- [ ] One final full demo run
- [ ] Charge everything
- [ ] Bring HDMI adapter + a mobile hotspot

---

## 4. 60-90 second pitch script

> Read this aloud, verbatim, until it feels natural.

**[0:00–0:10] Hook**
> "Everyone gets the same media-literacy advice. But you and I are fooled by *different* things. TruthLoop shows each person *their own* blind spot."

**[0:10–0:40] Demo the voting loop**
> Open `/`, sign in, tap a claim, vote, show verdict.
> "Vote on real-vs-fake. AI verifies. Earn points. Simple."

**[0:40–1:10] Demo the unique differentiator — Scam Forecast + Weekly Report**
> Switch to `/forecast` → "Today's Scam Forecast, generated by AI from this morning's headlines. Users vote on what they believe."
> Switch to `/reports/weekly` → "And here's the personal blind-spot report. This user got fooled by *manipulated statistics* 4 times this week. That's not generic advice — that's their specific weakness."

**[1:10–1:25] The insight + honesty**
> "This mirrors how real MIL trainers work — with individuals, not generic checklists. And we hand-verified our claim set; production would need a hardened verification pipeline."

**[1:25–1:30] Roadmap**
> "Live news ingestion, classroom mode, multi-language. Ship the personalization first."

---

## 5. Demo run-of-show (judges will see this exact flow)

1. **Cold load `/`** — see the home feed, populated with 20 claims
2. **Click a claim** — see full text, vote Real/Fake
3. **Vote** — verdict reveals with explanation, source URL, category badge
4. **Scroll to comments** — see existing threaded discussion
5. **Post a reply** — see it appear live
6. **Switch to `/forecast`** — see today's AI scam forecast
7. **Vote on a forecast** — see live tally update
8. **Switch to `/leaderboard`** — show daily + all-time tabs, populated
9. **Switch to `/profile`** — show earned badges, points
10. **Switch to `/reports/weekly`** — THE MOMENT. 3-section report, the "wow"
11. **Open `/submit`** — paste a known fake headline, show AI live fact-check
12. **End on the weekly report** — pause for effect

---

## 6. Anticipated judge questions + prepared answers

| Judge question | Answer |
| --- | --- |
| "How do you prevent bias in the AI's verdict?" | "We hand-verified all 20 claims in the main feed and wrote the explanations ourselves — Claude is not the source of truth, it's the writing assistant. The submission-tab fact-check is Claude with a confidence score so users can see when it's unsure." |
| "What about user-submitted content moderation?" | "Every new comment is AI-moderated with a toxicity filter before persistence. The submission tab is a separate flow, not in the main feed, so it can't pollute the curated experience." |
| "How is this different from existing MIL apps like Factitious?" | "Those are pure quiz games — everyone gets the same advice at the end. We generate a *personal* blind-spot report based on what specifically fooled *you* this week. Plus the daily AI scam forecast is a unique category." |
| "What's the business model?" | "B2B for newsrooms and MIL NGOs is the obvious one. Consumer could be freemium with a 'pro' tier for unlimited weekly reports and classroom mode. Schools are a natural market." |
| "Is it ethical to gamify misinformation?" | "It's a research-backed approach called 'pre-bunking' — controlled exposure to manipulation tactics builds resistance. We show the verdict immediately so users learn the technique, not just the answer." |
| "How do you handle non-English misinformation?" | "English-only for the hackathon. Multi-language is on the roadmap — the AI prompts are language-agnostic." |
| "Why is the demo data so pre-populated?" | "To show the full system in motion in 60 seconds. The 48-hour build didn't allow for live multi-day user growth to surface the leaderboard and report." |
| "What's the hardest technical problem you solved?" | "Probably the blind-spot narrative — getting Claude to write 1 sentence that's supportive not shaming, with a tone-check self-eval we use to retry." |

---

## 7. If you're running out of time (cut in this order)

1. ~~Submit tab + live AI fact-check~~ — still has the curated feed
2. ~~Email integration~~ — in-app notifications only
3. ~~SSE real-time~~ — polling fallback
4. ~~Full Reddit-style comments~~ — 1-level only
5. ~~All-time leaderboard tab~~ — daily only
6. ~~Some badges~~ — keep 4 of 8
7. ~~Weekly report on-demand regen~~ — Sunday cron only

**The non-negotiables (in order):**
1. Voting loop (sign in, see claim, vote, see verdict) — without this, there's no product
2. Weekly blind-spot report (pre-seeded for demo account) — this is the pitch
3. Scam Forecast page (with at least 1 item, AI-generated) — differentiator
4. Comments (at least 1 level of nesting) — community feel
5. Leaderboard (at least daily) — gamification visible
6. Gumroad design polish — judges remember visuals

---

## 8. After the hackathon (v2 priorities)

If the team continues:

1. **Real-time claim ingestion** (RSS, Twitter, Google News) → automatically generate claim candidates → human review queue → publish
2. **Classroom mode** (educator creates cohort, assigns claims, sees student reports)
3. **Public API** for fact-checking orgs to publish verdicts directly
4. **Mobile app** (React Native, reuse TanStack Query + design tokens)
5. **Multi-language** with localized AI prompts
6. **Verified accounts** (newsrooms, fact-checkers) with a checkmark badge
7. **Streaks & challenges** (e.g. "Spot 5 manipulated stats in a row")
8. **Premium tier** with deeper report history, API access, custom claim feeds
