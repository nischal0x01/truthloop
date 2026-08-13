# 06 — Roadmap & 48-Hour Build Plan

> The hour-by-hour plan. The team should be able to read this and know exactly what to do at 3:47am Sunday.

> **Status as of 2026-08-13** — see §0 at the top for "what's done / what's left / what's next" before reading the hour-by-hour plan below.

---

## 0. Quick status (2026-08-13)

Legend: ✅ built · ⏳ partially built · ⬜ not started · ❌ cut

### Pitch-critical non-negotiables

| # | Item | Status | Notes |
| --- | --- | --- | --- |
| 1 | Voting loop (sign in → see claim → vote → see verdict) | ✅ | `/claims` + `/claims/:id` Feed view, optimistic voting via TanStack Query |
| 2 | Weekly blind-spot report | ✅ | `/reports/weekly`, range-filter (week/month/quarter/custom), 4 recharts components, regenerate endpoint. Pre-seeded for `demo@truthloop.app`. |
| 3 | Scam Forecast page (≥ 1 AI-generated item) | ⬜ | `forecasts` table exists in schema. **No backend route, no frontend page, no AI wiring yet.** |
| 4 | Comments (≥ 1 level of nesting) | ✅ | `/discussions` + nested `PostCard` + CommentThread |
| 5 | Leaderboard (≥ daily) | ✅ | `/leaderboard` |
| 6 | Gumroad design polish | ✅ | Design system extracted → `app/Design.md`; tokens in `app/src/index.css`; high-end-visual-design applied across all built screens |

### Originally on the "cut if short on time" list

| Item | Status | Notes |
| --- | --- | --- |
| ~~Submit tab + live AI fact-check~~ | ⬜ | Nothing started. Was cut early per §7 list, but the pitch script still references it — see §11. |
| ~~Email integration~~ | ⬜ | Notifications table exists, no Resend dependency, no cron |
| ~~SSE real-time~~ | ⬜ | Polling fallback not even wired. No EventSource in frontend. |
| ~~Full Reddit-style comments~~ | ⏳ | 1-level only. Schema supports nested via `parentCommentId`. |
| ~~All-time leaderboard tab~~ | ⏳ | Daily scope shipping; all-time scope is a tab toggle, easy. |
| ~~Some badges~~ | ⏳ | Tables exist; need to confirm trigger logic runs on every guess. |
| ~~Weekly report on-demand regen~~ | ✅ | `POST /api/reports/weekly/regenerate` works, week-only (intentional — see WeeklyReport.tsx) |

### Range filter on Weekly Report (extra — not in original plan)

| Item | Status | Notes |
| --- | --- | --- |
| Week / Month / Quarter / Custom range | ✅ | RangePicker chip row, server-side bucketing (daily ≤ 31 days, weekly beyond), URL-synced (`?range=...&from=...&to=...`) |


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

- [x] Pull latest, `npm install` in root
- [x] **Backend**: extend `schema.sql` with all 10 new tables, run on Railway Postgres
- [x] **Backend**: set up env vars in Railway
- [x] **Frontend**: configure Tailwind v4 with Gumroad design tokens (`.ai/07-design-tokens.md`)
- [x] **Frontend**: install React Router, TanStack Query, lucide-react
- [x] **Both**: agree on TypeScript types for `Claim`, `Guess`, `Comment`, `User`, etc. in `shared/types.ts`

**Demo gate**: App shows "Hello World" on Vercel preview + `GET /api/health` returns ok.

### Hour 2–6: Core voting loop (the heart of the product)

- [x] **Backend**: `GET /api/claims` (list, filterable) + `GET /api/claims/:id` + `POST /api/claims/:id/guess`
- [x] **Backend**: Google OAuth + JWT cookie + `GET /api/auth/me`
- [x] **Frontend**: `App.tsx` → Router + Layout + TopNav
- [x] **Frontend**: `ClaimCard` + `ClaimDetail` screens, vote flow
- [x] **Frontend**: wire to backend, optimistic vote

**Demo gate**: Sign in with Google, see claims, vote, see verdict + explanation. ✅

### Hour 6–10: Comments + AI toxicity

- [x] **Backend**: `GET/POST /api/claims/:id/comments` (with AI toxicity filter)
- [ ] **Backend**: AI client wrapper + toxicity prompt (`.ai/05-ai-prompts.md` §3) — schema-level guard only, no `@anthropic-ai/sdk` wired
- [x] **Frontend**: `CommentThread` (1-level nesting for v1 to keep SQL simple — extend to full Reddit tree in hour 30-32)
- [x] **Frontend**: comment composer with optimistic submit

**Demo gate**: Post a comment, see it appear with the right tone. Post a slur, get a 403.

### Hour 10–14: Gamification (points, badges, leaderboard)

- [x] **Backend**: increment `users.points` on correct guess (trigger or app-level)
- [~] **Backend**: badge trigger logic (`first-guess`, `truth-teller`, `on-a-roll`) — schema exists; verify trigger fires on every guess
- [x] **Backend**: `GET /api/leaderboard?scope=daily|all-time`
- [x] **Frontend**: points display in TopNav, animated +1 on correct
- [x] **Frontend**: badge toast + `/profile` page with badge grid
- [x] **Frontend**: `/leaderboard` page with Daily/All-time tabs

**Demo gate**: Vote correctly 3 times, see the coin count rise, see "First Guess" badge animate in. ✅ (modulo badge trigger verification)

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

- [x] **Backend**: weekly report stub (`.ai/05-ai-prompts.md` §4 — narrative is a fallback string until AI narrative prompt is wired)
- [x] **Backend**: `GET /api/reports/weekly` (range-aware: week/month/quarter/custom) + `POST /api/reports/weekly/regenerate` (week-only)
- [x] **Frontend**: `/reports/weekly` page — 5 sections (accuracy, blind spot, trend, categories, replay) + recharts visualizations + RangePicker
- [x] **Frontend**: regenerate button (hidden on non-week ranges by design)

**Demo gate**: Demo account's report is populated, shows 12/16 accuracy, a real narrative, a replay claim. ✅ (narrative is fallback text — see §11 to upgrade)

### Hour 26–30: Real-time + Notifications + Email

- [ ] **Backend**: SSE broadcaster (`.ai/03-system-architecture.md` §3.6)
- [ ] **Backend**: `GET /api/sse/connect`
- [ ] **Backend**: notification triggers on every event (table exists, no trigger wired)
- [ ] **Backend**: Resend email integration + React Email template
- [ ] **Backend**: daily digest cron (manual trigger for demo)
- [ ] **Frontend**: `useSSE` hook + `<Bell>` + notification dropdown
- [ ] **Frontend**: live comment updates on claim page
- [ ] **Frontend**: settings page for email preferences

**Demo gate**: Open two browser tabs, post a comment in one, see it in the other within 2s. Bell shows unread count.

### Hour 30–34: Polish & Integration

- [~] **Frontend**: full Reddit-style nested comments (extend from 1-level — schema supports `parentCommentId`)
- [ ] **Frontend**: leaderboard live updates via SSE
- [~] **Frontend**: empty states, loading skeletons, error states everywhere (WeeklyReport + Discussions done; check /claims, /leaderboard, /profile)
- [x] **Frontend**: animation pass (use `impeccable:animate` skill or framer-motion) — Editorial Split + mask-reveal applied to /discussions and /reports/weekly
- [~] **Frontend**: responsive pass (mobile + tablet, even though primary is desktop) — chart cards stack, but verify each page

### Hour 34–38: Demo data + Seed

- [~] **Backend**: write `seed.sql` with 50 users, 200+ guesses, 30+ comments, 5 alerts, 1 weekly report — `seed.ts` exists; verify it covers all pages for demo account
- [ ] **Backend**: generate 2-3 days of scam forecasts
- [~] **Frontend**: empty-state copy, demo account banner — fallback copy on WeeklyReport empty state; demo banner TBD
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

---

## 9. Next-up priority queue (recommended order)

What's actually left to ship the demo, ordered by ROI. **Pick from the top of this list until the timer runs out — every item below is a meaningful demo moment, and the cut-order in §7 still applies.**

### Tier 1 — pitch-critical (NOT startable without these)

| # | Task | Why now |
| --- | --- | --- |
| 1 | **Install `@anthropic-ai/sdk` in server/** + create `server/src/ai/` with a `client.ts` wrapper + Zod schemas. | Unblocks everything below — without it no AI prompt can run. 1.5h. |
| 2 | **Wire the BLIND-SPOT NARRATIVE prompt** (`.ai/05-ai-prompts.md` §4) into `POST /weekly/regenerate` and on-demand cache write. Replace the hardcoded fallback string with a real `claude-sonnet-4-5` call. Keep the tone-check self-eval step. | The report right now reads "You missed 62% of misattributed_quote claims this week — that's the pattern worth studying." That's the *single line* that anchors the pitch. Make it sing. 2h. |
| 3 | **Build `/forecast` end-to-end**: schema is ready. Need (a) `POST /api/forecast/generate` (calls `.ai/05-ai-prompts.md` §1), (b) `GET /api/forecast/today`, (c) `POST /api/forecast/:id/vote`, (d) seed 2-3 days for demo, (e) `/forecast` page with severity-tinted cards + vote buttons. | Pitch script says "see today's forecast" at 0:40. Currently a stub. 4h. |

### Tier 2 — also pitched, lower urgency

| # | Task | Why |
| --- | --- | --- |
| 4 | **Build `/submit` page** (`POST /api/submissions` + claude-opus-4-1 fact-check) | Pitch script step 11 references it. Was cut early; ship it if Tier 1 lands fast. 3h. |
| 5 | **Toxicity moderation** on existing `/api/comments` (currently no `@anthropic-ai/sdk` call) — wire prompt from `.ai/05-ai-prompts.md` §3 | Already partially built (mock guard). Replace with real Claude call. 1h. |

### Tier 3 — quality-of-life wins

| # | Task | Why |
| --- | --- | --- |
| 6 | **Reddit-style nested comments** (extend from 1-level; schema already supports `parentCommentId`). Just UI work in `PostCard.tsx` + `actions/discussions.ts`. | Pitch script doesn't promise it, but reviewers will check. 2h. |
| 7 | **All-time leaderboard tab** (currently daily only) | Easy tab toggle in `Leaderboard.tsx`. Endpoint already accepts `scope=`. 30min. |
| 8 | **Server-side render of seeded `<Bell>`** (notifications table exists, no trigger). Add a per-user notification for every correct guess + every reply on your comments. Show in nav. | Demo differentiator on /profile. 1.5h. |
| 9 | **Verification pass on ** `/claims`, `/leaderboard`, `/profile` empty states + skeletons (WeeklyReport + Discussions done) | Cheaper than it sounds, removes the most common judge complaint. 1h. |
| 10 | **Mobile responsive pass** on the new Editorial Split layouts (Discussions + WeeklyReport) — they target desktop-first (`md:grid-cols-[1.5fr_1fr]`) | Verify sm: breakpoint stacks cleanly without overflow. 30min. |
| 11 | **Demo account banner** on `/` and `/claims` for non-demo viewers. | Cosmetic but easy to add. 20min. |

### Tier 4 — long-tail, cut first if needed

| # | Task | Why (and why it's low) |
| --- | --- | --- |
| 12 | **SSE real-time** (`GET /api/sse/connect`, `EventSource` consumer) — falls back to polling | §7 cut-order: nice demo moment (open two tabs, see live update) but optional. 4h. |
| 13 | **Resend email integration** + daily digest cron + `/settings` page | §7 cut-order: in-app notifications cover the demo. 3h. |
| 14 | **AI narrative for SCAM FORECAST items** (`.ai/05-ai-prompts.md` §1) | Forecast items alone (without per-item AI narrative) still demo fine. 1h. |
| 15 | **Badge ceremony polish** (full 8 badges, animated unlock toasts on first-trigger) | §7 cut-order: keep 4 of 8. 1h. |

### Open questions to resolve before building

These aren't blockers but should be settled before the corresponding task lands:

- Where does the `/forecast` page link from? Currently a static landing section but no in-app route. Add to nav or keep landing-only?
- For `submit` fact-check: do we persist the submission to a `submissions` table for review, or only show the verdict and discard?
- Does the AI narrative cost get billed per-call or per-user-once? (For demo, per-user; for prod, cache by `(userId, weekStarting)`.)
- For Resend: do we send from `hello@truthloop.app` (needs DNS) or Resend's `onboarding@resend.dev` for demo?

---

## 10. Decision log (changes made during the build)

- **2026-08-13** — Added range filter to `/reports/weekly`. Server: `GET /api/reports/weekly` now range-aware (`kind=week|month|quarter|custom&from=...&to=...`), bucketed trend (daily ≤ 31 days, weekly beyond), per-report cache preserved for `kind=week` defaults. Client: `RangePicker` chip row + URL-synced custom modal. Regenerate button now hidden on non-week ranges. Plan: `/Users/sajjankarna/.claude/plans/eager-wiggling-panda.md`.
- **2026-08-13** — Replaced hand-rolled bars on `/reports/weekly` with recharts (`AccuracyComparison` radial meters, `OutcomeDonut`, `CategoryBarChart` with blind-spot emphasis, `TrendArea` small-multiples). Plan + rec installed `recharts@3.10.1`.
- **2026-08-13** — Editorial Split hero applied to `/discussions` + `/reports/weekly` using the `high-end-visual-design` skill.
- **2026-08-13** — Refactored `/discussions` page layout: Editorial Split hero with live stats, sticky toolbar, animated category chips, featured `PostCard` variant for the top post.
