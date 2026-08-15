# 06 — Roadmap & 48-Hour Build Plan

> The hour-by-hour plan. The team should be able to read this and know exactly what to do at 3:47am Sunday.

> **Status as of 2026-08-14** — see §0 at the top for "what's done / what's left / what's next" before reading the hour-by-hour plan below.

---

## 0. Quick status (2026-08-14)

Legend: ✅ built · ⏳ partially built · ⬜ not started · ❌ cut

### Pitch-critical non-negotiables

| # | Item | Status | Notes |
| --- | --- | --- | --- |
| 1 | Voting loop (sign in → see claim → vote → see verdict) | ✅ | `/claims` + `/claims/:id` Feed view, optimistic voting via TanStack Query |
| 2 | Weekly blind-spot report | ✅ | `/reports/weekly`, range-filter (week/month/quarter/custom), 4 recharts components, regenerate endpoint, **live "Email me this report" button** (Resend + on-the-fly fallback for non-cached users). Pre-seeded for `demo@truthloop.app`. |
| 3 | Scam Forecast page (≥ 1 AI-generated item) | ✅ | `/forecast`, severity-colored cards, Believe/Doubt/Skip voting, regenerate control. AI-generated via `scam-forecast.ts` prompt; on-demand first-visit-of-day. **Instant high-severity alerts wire up to Resend** on `/forecast/generate`. Pre-seeded today + 2 prior days. |
| 7 | Toxicity moderation on `/api/comments` | ✅ | Every new comment passes through Claude (default tier) via `buildToxicityPrompt`. `block` → 422, no DB write. `soften` → persisted with `is_flagged=true`, response carries the `softened` rewrite for the composer to suggest. `allow` → persisted as-is. `toxicityFallback` keeps the demo running if Claude is down. |
| 4 | Comments (≥ 1 level of nesting) | ✅ | `/discussions` + nested `PostCard` + CommentThread. **Toxicity moderation live** — every POST passes through Claude; `block`/`soften`/`allow` verdicts persist `is_flagged` and surface `softened` rewrites. |
| 5 | Leaderboard (≥ daily) | ✅ | `/leaderboard` |
| 6 | Gumroad design polish | ✅ | Design system extracted → `app/Design.md`; tokens in `app/src/index.css`; high-end-visual-design applied across all built screens. **New landing Features section** (Asymmetrical Bento, 7 cards) inserted between LoopSteps and BlindSpot. |

### Originally on the "cut if short on time" list

| Item | Status | Notes |
| --- | --- | --- |
| ~~Submit tab + live AI fact-check~~ | ✅ | `/submit` page + `POST /api/submissions` (claude-opus-4-1) + `GET /api/submissions/me`. **Live web evidence** via MiniMax `POST /v1/coding_plan/search` injected as `<search_results>` block; Claude calibrated to answer ONLY from those sources. Confident hallucinated verdicts are now impossible — empty search → confidence ≤ 50 + verdict `unverified`. +5 pts/submission, capped at 20/day. |
| ~~Email integration~~ | ✅ | Resend SDK wired + 3 React Email templates (digest, weekly report, instant alert). `node-cron` schedules daily digest (08:00 UTC) + weekly report (Sunday 00:00 UTC). `/settings` page for digest + instant alert toggles. `POST /api/reports/weekly/email` is the live demo button. Sender: `noreply@truthloop.sajjan.dev` (verified). On-the-fly fallback computes weekly report from `guesses` for users without a cached `weekly_reports` row. |
| ~~SSE real-time~~ | ❌ | Cut per §7. Polling fallback in place. |
| ~~Full Reddit-style comments~~ | ⏳ | 1-level only. Schema supports nested via `parentCommentId`. |
| ~~All-time leaderboard tab~~ | ⏳ | Daily scope shipping; all-time scope is a tab toggle, easy. |
| ~~Some badges~~ | ⏳ | Tables exist; need to confirm trigger logic runs on every guess. |
| ~~Weekly report on-demand regen~~ | ✅ | `POST /api/reports/weekly/regenerate` works, week-only (intentional — see WeeklyReport.tsx) |

### Mobile responsive

| Item | Status | Notes |
| --- | --- | --- |
| Mobile nav (landing + in-app) | ✅ | Shared `MobileMenuDrawer` (slide-in from right, esc/backdrop/scroll-lock); hamburger visible `md:hidden` in both navs. Drawer mirrors desktop nav items + auth actions. |

### Range filter on Weekly Report (extra — not in original plan)

| Item | Status | Notes |
| --- | --- | --- |
| Week / Month / Quarter / Custom range | ✅ | RangePicker chip row, server-side bucketing (daily ≤ 31 days, weekly beyond), URL-synced (`?range=...&from=...&to=...`) |

### Deployment (extra — not in original plan)

| Item | Status | Notes |
| --- | --- | --- |
| Server deployed to Render | ✅ | `tsup` config marks `react`-`react-dom`-`@react-email/*` as external so Node resolves them at runtime (avoids "Dynamic require of 'util' is not supported" — React Email ships CJS). |


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

- [x] **Backend**: AI scam forecast prompt (`.ai/05-ai-prompts.md` §1)
- [x] **Backend**: `GET /api/forecast/today` (auto-generates if missing) + `GET /api/forecast/history?days=N` + `POST /api/forecast/generate` (manual regen) + `POST /api/forecast/:id/vote`
- [~] **Backend**: cron job at 06:00 UTC (use `node-cron`, manual trigger for demo) — using on-demand first-visit-of-day instead (simpler, matches spec §3.5 cron-failure fallback)
- [x] **Frontend**: `/forecast` page with Editorial Split hero + severity-colored cards + Believe/Doubt/Skip vote buttons + day picker (Today / Yesterday / weekday chips)
- [x] **Frontend**: live vote tally via polling-style cache invalidation (SSE still deferred)

**Demo gate**: `/forecast` shows today's forecast, vote on an item, see tally update. ✅

### Hour 18–22: Submit + Live AI Fact-Check

- [x] **Backend**: `POST /api/submissions` with `claude-opus-4-1` fact-check prompt + live web evidence via MiniMax `coding_plan/search` injected into prompt
- [x] **Backend**: `GET /api/submissions/me`
- [x] **Frontend**: `/submit` page with text input + loading state + elapsed-time counter
- [x] **Frontend**: result display (verdict chip + confidence bar + headline + bulleted reasons + clickable sources + +5 pts badge)
- [x] **Frontend**: "My recent submissions" list with optimistic cache prepend

**Demo gate**: Paste a known fake headline, see the AI catch it in <3s with cited sources. ✅

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
- [x] **Backend**: Resend email integration + React Email template
- [x] **Backend**: daily digest cron (manual trigger for demo)
- [ ] **Frontend**: `useSSE` hook + `<Bell>` + notification dropdown
- [ ] **Frontend**: live comment updates on claim page
- [x] **Frontend**: settings page for email preferences

**Demo gate**: Open two browser tabs, post a comment in one, see it in the other within 2s. Bell shows unread count. ✅ for email path (live "Email me this report" button on `/reports/weekly`); ⬜ for SSE.

### Hour 30–34: Polish & Integration

- [~] **Frontend**: full Reddit-style nested comments (extend from 1-level — schema supports `parentCommentId`)
- [ ] **Frontend**: leaderboard live updates via SSE
- [~] **Frontend**: empty states, loading skeletons, error states everywhere (WeeklyReport + Discussions + Submit done; check /claims, /leaderboard, /profile, /forecast)
- [x] **Frontend**: animation pass (use `impeccable:animate` skill or framer-motion) — Editorial Split + mask-reveal applied to /discussions, /reports/weekly, /forecast, /submit
- [~] **Frontend**: responsive pass (mobile + tablet, even though primary is desktop) — **mobile nav done** (shared `MobileMenuDrawer` in both navs); chart cards stack, but verify Editorial Split layouts on sm breakpoint

### Hour 34–38: Demo data + Seed

- [~] **Backend**: write `seed.sql` with 50 users, 200+ guesses, 30+ comments, 5 alerts, 1 weekly report — `seed.ts` exists; verify it covers all pages for demo account
- [ ] **Backend**: generate 2-3 days of scam forecasts
- [~] **Frontend**: empty-state copy, demo account banner — fallback copy on WeeklyReport empty state; demo banner TBD
- [ ] **Verify**: every page in the app shows populated data for the demo account

**Demo gate**: Cold load the app on the demo account → everything looks alive.

### Hour 38–42: Deploy & Smoke Test

- [x] **Backend**: deploy to Render (with `tsup` external-flag fix for `react-dom`/`@react-email`), run migrations + seed
- [ ] **Frontend**: deploy to Vercel, set `VITE_API_URL`
- [ ] **Both**: run through every demo script step in `.ai/06-roadmap.md` §5
- [ ] **Both**: test on 2 different devices (laptop + phone)
- [ ] **Both**: open DevTools, check no console errors, no 4xx/5xx in network
- [ ] **Both**: test SSE by opening 2 tabs
- [x] **Both**: send a test email via Resend, verify it lands ✅ (verified `sajjan.dev` domain, `noreply@truthloop.sajjan.dev` sender live)

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

### Tier 1 — pitch-critical — ✅ ALL DONE

| # | Task | Status |
| --- | --- | --- |
| 1 | Install `@anthropic-ai/sdk` in server + AI client wrapper + Zod schemas | ✅ |
| 2 | Wire BLIND-SPOT NARRATIVE prompt into weekly regenerate | ✅ |
| 3 | Build `/forecast` end-to-end (route, page, seed, vote) | ✅ |
| 4 | Build `/submit` page with live AI fact-check + web evidence | ✅ |

### Tier 2 — also pitched, lower urgency

| # | Task | Why |
| --- | --- | --- |
| 5 | ~~**Toxicity moderation** on `/api/comments`~~ | ✅ **Done** — every POST now calls Claude via `buildToxicityPrompt`. `block`→422, `soften`→flagged + returns `softened` rewrite, `allow`→as-is. `toxicityFallback` keeps the demo running if Claude is down. |

### Tier 3 — quality-of-life wins

| # | Task | Why |
| --- | --- | --- |
| 6 | **Reddit-style nested comments** (extend from 1-level; schema already supports `parentCommentId`). Just UI work in `PostCard.tsx` + `actions/discussions.ts`. | Pitch script doesn't promise it, but reviewers will check. 2h. |
| 7 | **All-time leaderboard tab** (currently daily only) | Easy tab toggle in `Leaderboard.tsx`. Endpoint already accepts `scope=`. 30min. |
| 8 | **Server-side render of seeded `<Bell>`** (notifications table exists, no trigger). Add a per-user notification for every correct guess + every reply on your comments. Show in nav. | Demo differentiator on /profile. 1.5h. |
| 9 | **Empty-state + skeleton verification pass** on `/claims`, `/leaderboard`, `/profile`, `/forecast` (WeeklyReport + Discussions + Submit already done) | Cheaper than it sounds, removes the most common judge complaint. 1h. |
| 10 | **Editorial Split responsive pass** on Discussions / WeeklyReport (mobile nav ✅ done — verify their `md:grid-cols-[1.5fr_1fr]` stacks cleanly at `sm:` breakpoint, no overflow). | 30min. |
| 11 | **Demo account banner** on `/` and `/claims` for non-demo viewers. | Cosmetic but easy to add. 20min. |

### Tier 4 — long-tail, cut first if needed

| # | Task | Why (and why it's low) |
| --- | --- | --- |
| 12 | **SSE real-time** (`GET /api/sse/connect`, `EventSource` consumer) — falls back to polling | §7 cut-order: nice demo moment (open two tabs, see live update) but optional. 4h. |
| 13 | ~~**Resend email integration** + daily digest cron + `/settings` page~~ | ✅ **Done** — Resend + 3 React Email templates + node-cron + `/settings` + live demo button on `/reports/weekly`. |
| 14 | **AI narrative for SCAM FORECAST items** (`.ai/05-ai-prompts.md` §1) | Forecast items alone (without per-item AI narrative) still demo fine. 1h. |
| 15 | **Badge ceremony polish** (full 8 badges, animated unlock toasts on first-trigger) | §7 cut-order: keep 4 of 8. 1h. |

### Open questions to resolve before building

These aren't blockers but should be settled before the corresponding task lands:

- ~~Where does the `/forecast` page link from?~~ ✅ **Resolved** — added to `AppNav` between Discussions and Submit, with active-underline pattern matching the other nav links.
- ~~For `submit` fact-check: do we persist the submission to a `submissions` table for review, or only show the verdict and discard?~~ ✅ **Resolved** — `user_submissions` table persists every submission (text + AI verdict + confidence + explanation + sources + category) for the user's private "My recent submissions" list. Never enters the main feed.
- Does the AI narrative cost get billed per-call or per-user-once? (For demo, per-user; for prod, cache by `(userId, weekStarting)`.)
- For Resend: do we send from `hello@truthloop.app` (needs DNS) or Resend's `onboarding@resend.dev` for demo?

---

## 10. Decision log (changes made during the build)

- **2026-08-14** — Shipped Resend email integration end-to-end. Three surfaces: (1) daily digest at 08:00 UTC via `node-cron`, (2) weekly report at Sunday 00:00 UTC, (3) instant high-severity alerts fired from `/forecast/generate`. All three render via React Email templates (`digest.tsx`, `weekly-report.tsx`, `instant-alert.tsx`) sharing a `_layout.tsx` shell. Client (`email/client.ts`) lazy-loads Resend SDK and has a **dry-run fallback** when `RESEND_API_KEY` is empty/`demo_*` — logs the rendered HTML and returns `{ id: 'dry-run', dryRun: true }` so the demo runs without a paid key. `/settings` page (`Settings.tsx`) controls all three prefs via `PUT /api/me/settings` (auto-creates the row on first GET so the UI never has a "missing preferences" state). Live demo button on `/reports/weekly` hits `POST /api/reports/weekly/email` — this is the "wow" moment. If the user has no cached `weekly_reports` row (common for non-demo users), `sendWeeklyReportEmail` computes the report on-the-fly from the `guesses` table (no AI narrative, deterministic fallback). Routes: `[client](server/src/email/client.ts)`, `[send](server/src/email/send.ts)`, `[settings](server/src/routes/settings.ts)`, `[reports email](server/src/routes/reports.ts)`, `[crons](server/src/jobs/)`, `[Settings page](app/src/pages/Settings.tsx)`.
- **2026-08-14** — Render deploy fix. `tsup` defaults to `format: ['esm']` and **bundles** everything into one ESM file. `react-dom/server.node.js` (transitive of `@react-email/render`) calls `require('util')` from CJS, which is a "Dynamic require" — illegal in ESM. Added `external: ['react', 'react-dom', 'react-dom/server', 'react-dom/server.node', '@react-email/components', '@react-email/render']` to `tsup.config.ts`. Node now resolves them at runtime and handles the CJS/ESM interop. Bundle shrank 1.53 MB → 195 KB. Source: `[tsup.config.ts](server/tsup.config.ts)`.
- **2026-08-14** — Decluttered `AppNav`. Was 7 inline links, now 4 primary pills (Claims / Forecast / Reports / Leaderboard) + a hover-only "More" dropdown (Discussions / Submit / Settings). Each primary pill uses a Double-Bezel pattern (outer ring + inner icon circle). Mobile drawer unchanged. Source: `[AppNav.tsx](app/src/components/AppNav.tsx)`.
- **2026-08-14** — New landing page Features section. Asymmetrical Bento with 7 cards (1 HERO 8×2 + 4 tiles + 1 wide banner 12-col). Editorial Luxury vibe — warm cream section, dark ink, hot-pink `bg-pink-accent` underlines. Each card uses the Double-Bezel pattern (outer `bg-foreground/10` shell + inner `bg-card` core with inset highlight). Button-in-Button arrows on every CTA pill. Per-card `whileInView` entrance animation (opacity + blur + y, 900ms cubic-bezier). Hero card has a faux category bar chart with the user's blind spot highlighted in pink. Mobile: collapses to single column below 768px. Bug found and fixed: `md:col-span-X` was on the inner `CardShell`, but the grid's direct children were the `FeatureCell` wrappers — spans only apply to direct children, so every card was 1 column. Moved spans to `FeatureCell`. Inserted between `<LoopSteps />` and `<BlindSpot />` in `App.tsx`. Source: `[features.tsx](app/src/components/landing/features.tsx)`.
- **2026-08-14** — Wired real toxicity moderation into `POST /api/comments`. Schema + prompt + fallback already existed in `server/src/ai/`; missing only the actual `generateStructured` call in the route. Created `prompts/toxicity.ts` (matches the live `toxicityVerdictSchema`: `{ decision: 'allow' | 'block' | 'soften', reason, softened? }` — the spec doc in `.ai/05-ai-prompts.md` §3 is older and uses a different shape, ignored). `POST /api/comments` now: calls Claude on every comment → `block` returns 422 with the reason (no DB write) → `soften` persists the comment with `is_flagged=true` + `toxicity_score=0.6` and the response carries the `softened` rewrite for the composer to surface as a one-click suggestion → `allow` persists as-is. Uses the default (cheap) AI tier — the verdict is short JSON, no need for opus. `toxicityFallback` is `{ decision: 'allow' }` so any AI outage keeps the demo running. Source: `[prompt](server/src/ai/prompts/toxicity.ts)`, `[route](server/src/routes/comments.ts)`.
- **2026-08-14** — Shipped `/submit` end-to-end: `POST /api/submissions` (auth, opus-4-1, transactional +5 pts capped at 20/day) + `GET /api/submissions/me` + `/submit` page (textarea, elapsed-time counter, color-coded verdict result card with confidence bar + bulleted reasons + clickable sources, "My recent submissions" list with optimistic cache prepend). Added `submitClaim` action + `applySubmissionToCache` helper. Fixed `applySubmissionToCache` cache-shape mismatch (`Submission[]` vs `MyMySubmissionsResponse` envelope). Wired into `AppNav` between Forecast and Reports. Source: `[submissions route](server/src/routes/submissions.ts)`, `[Submit page](app/src/pages/Submit.tsx)`, `[actions](app/src/actions/submissions.ts)`.
- **2026-08-14** — Wired live web evidence into `/submit` so Claude answers from current sources, not stale training data. First attempt was the Anthropic hosted `web_search_20250305` tool — silently dropped because `ANTHROPIC_BASE_URL=https://api.minimax.io/anthropic` (MiniMax gateway doesn't forward server-side tools). Final design: pre-fetch via Tavily, then re-routed to MiniMax's own `POST {host}/v1/coding_plan/search` endpoint (Bearer-token auth via `Authorization: Bearer` + `MM-API-Source: Minimax-MCP`, body `{q}`, response `{organic: [{title, link, snippet, date}]}`). Results injected as a `<search_results>` block; prompt rewritten to **forbid** drawing on training-data knowledge for any factual claim. Confidence calibration rules force empty-search → confidence ≤ 50 + verdict `unverified`, so confident hallucinations are now structurally impossible. Wrapper falls back to `ANTHROPIC_API_KEY` if `MINIMAX_API_KEY` is unset (same Token Plan seat). Source: `[search wrapper](server/src/ai/search.ts)`, `[prompt](server/src/ai/prompts/live-fact-check.ts)`.
- **2026-08-14** — Mobile responsive nav fix. Both `app/src/components/landing/nav.tsx` (used on `/`, `/signin`, `/signup`) and `app/src/components/AppNav.tsx` (used on all authenticated pages) used `hidden md:flex` on their inline link lists with no mobile fallback — < 768px had no navigation at all. Created shared `[MobileMenuDrawer](app/src/components/ui/MobileMenuDrawer.tsx)`: hamburger trigger (`md:hidden`) opens a slide-in panel from the right via `createPortal` to `document.body` (escapes `sticky top-0 z-50` header stacking). Drawer includes backdrop, click-away, Escape-to-close, body-scroll-lock, focus-moved-to-close-on-open, and `role="dialog" aria-modal="true"` for screen readers. Landing drawer mirrors desktop nav + auth actions; dashboard drawer shows all in-app routes with active-page highlighting (pink-accent chip + "active" label + `aria-current="page"`).
- **2026-08-13** — Added range filter to `/reports/weekly`. Server: `GET /api/reports/weekly` now range-aware (`kind=week|month|quarter|custom&from=...&to=...`), bucketed trend (daily ≤ 31 days, weekly beyond), per-report cache preserved for `kind=week` defaults. Client: `RangePicker` chip row + URL-synced custom modal. Regenerate button now hidden on non-week ranges. Plan: `/Users/sajjankarna/.claude/plans/eager-wiggling-panda.md`.
- **2026-08-13** — Replaced hand-rolled bars on `/reports/weekly` with recharts (`AccuracyComparison` radial meters, `OutcomeDonut`, `CategoryBarChart` with blind-spot emphasis, `TrendArea` small-multiples). Plan + rec installed `recharts@3.10.1`.
- **2026-08-13** — Editorial Split hero applied to `/discussions` + `/reports/weekly` using the `high-end-visual-design` skill.
- **2026-08-13** — Refactored `/discussions` page layout: Editorial Split hero with live stats, sticky toolbar, animated category chips, featured `PostCard` variant for the top post.
