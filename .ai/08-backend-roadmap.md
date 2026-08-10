# 08 — Backend Engine Build Roadmap

> The complete, ordered build plan for the **TruthLoop backend** (`server/`).
> Reads as: every ticket the backend lead must finish, in dependency order, sized for a 48-hour hackathon.
> Source of truth lives in `.ai/01`–`.ai/07`. This document just sequences the work.

---

## 0. Current state (audit)

What already exists in [`server/`](../server/):

| Area | State | Notes |
| --- | --- | --- |
| Express bootstrap | ✅ Done | helmet, cors, compression, session, morgan, error handler in [src/index.ts](../server/src/index.ts) |
| DB pool | ✅ Done | `pg.Pool` + `query`/`transaction`/`healthCheck` in [src/utils/db.ts](../server/src/utils/db.ts) |
| Config | ✅ Done | env-driven, but missing `JWT_SECRET`, `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, `CORS_ORIGIN` |
| Logger | ✅ Done | pino-style wrapper in [`src/utils/logger.ts`](../server/src/utils/logger.ts) |
| Middleware | ✅ Partial | errorHandler + validation exist; **missing**: `requireAuth`, `rateLimit`, `requireAdmin` |
| `users` table | ✅ Exists | but missing `google_id`, `streak_days`, `last_active_date`, `email_bounced`, `updated_at` |
| `claims` table | ✅ Exists | but missing `is_published`, `published_at`, `trending_score`, `vote_count` |
| `guesses` table | ✅ Exists | but **no `UNIQUE(user_id, claim_id)`** constraint |
| Auth routes | ✅ Partial | Google OAuth + email/password; **uses session cookies, not JWT** — needs the migration |
| Claims routes | ✅ Partial | list/detail/guess/weekly-report; **no comment routes, no submission routes, no leaderboard, no badges** |
| AI client | ❌ Missing | `@anthropic-ai/sdk` not installed, no client wrapper |
| Scheduled jobs | ❌ Missing | `node-cron` not installed |
| SSE | ❌ Missing | no `EventEmitter`, no `/api/sse/connect` |
| Email | ❌ Missing | `resend` not installed, no templates |
| 7 of 10 tables | ❌ Missing | comments, comment_votes, user_submissions, scam_forecasts (+ items), forecast_votes, badges, user_badges, notifications, weekly_reports, user_settings |
| Seed data | ❌ Missing | only 5 sample claims; no users, no reports, no forecasts |

> **Net read**: the scaffolding is solid, but we have ~70% of the schema work, ~40% of the routes, and ~10% of the integrations to ship.

---

## 1. Sequencing principle

We order work by **dependency graph**, not by hour. Each phase ends with a **demo gate** — a working slice a frontend or judge can see.

```
Phase 1 ─► Phase 2 ─► Phase 3 ─► Phase 4 ─► Phase 5 ─► Phase 6 ─► Phase 7 ─► Phase 8 ─► Phase 9
Schema     Auth+JWT   Core loop   Comments   AI client  Gamif.    Forecast   Weekly     Realtime
+seed                 + gamif     +moder.    (4 prompts) +badges   +cron      report     +email
                                                                         +cron      +SSE
```

---

## 2. Phase-by-phase plan

### **Phase 1 — Schema & seed (Hour 0–2)**  ·  Demo gate: DB live with full schema

> The whole build stands on this. Do it first, do it right, do not touch again.

**1.1 Extend [`server/src/db/schema.sql`](../server/src/db/schema.sql)** — idempotent only (every statement wrapped in `IF NOT EXISTS` / `CREATE OR REPLACE`)

- [ ] Extend `users`: add `google_id TEXT UNIQUE`, `streak_days INT`, `last_active_date DATE`, `email_bounced BOOL DEFAULT false`, `updated_at TIMESTAMPTZ`
- [ ] Extend `claims`: add `is_published BOOL DEFAULT true`, `published_at TIMESTAMPTZ`, `trending_score REAL DEFAULT 0`, `vote_count INT DEFAULT 0`
- [ ] Extend `guesses`: add `UNIQUE (user_id, claim_id)` constraint (one-vote-locked rule)
- [ ] Add `user_settings` (1-1 with users) — email preferences + timezone
- [ ] Add `comments` + `comment_votes` — self-ref `parent_comment_id`, GIN/GIST indexes
- [ ] Add `user_submissions` — text + AI verdict + sources JSONB
- [ ] Add `scam_forecasts` + `scam_forecast_items` (one row per day + 1–3 items)
- [ ] Add `forecast_votes` — `(user_id, forecast_item_id)` PK
- [ ] Add `badges` (8 seed rows) + `user_badges` (composite PK)
- [ ] Add `notifications` (typed enum, JSONB metadata)
- [ ] Add `weekly_reports` (UNIQUE on `(user_id, week_starting)`)

**1.2 Add Postgres triggers**

- [ ] `trg_increment_points` — on correct guess, `users.points += 10`, also insert `'first-guess'` badge if first guess ever
- [ ] `trg_check_discussion_starter` — on comment upvote reaching 3, insert `'discussion-starter'` badge
- [ ] (Streak + fact-checker badges stay in app code — clearer to debug at 3am)

**1.3 Indexes**

- [ ] `idx_claims_published_trending` (partial, `WHERE is_published = true`)
- [ ] `idx_claims_text_search` (GIN on `to_tsvector('english', text || explanation)`)
- [ ] `idx_guesses_user_created` (powers weekly report query)
- [ ] `idx_notifications_user_unread` (partial, `WHERE is_read = false`)
- [ ] `idx_weekly_reports_user` (powers history view)

**1.4 Migrations runner**

- [ ] New file `server/src/db/migrate.ts` — reads `schema.sql`, executes as one transaction, logs each step
- [ ] New file `server/src/db/reset.ts` — drops all, re-runs migrate + seed (dev-only, behind `NODE_ENV !== 'production'` check)
- [ ] Add npm scripts: `"db:migrate"`, `"db:reset"`, `"db:seed"`

**1.5 Heavy seed (`server/src/db/seed.sql` + `seed-claims.json`)**

> **Heavy seed is mandatory.** Judges cold-load the app — every page must look populated.

- [ ] **20 hand-written claims** with `category` + 2–3 sentence `explanation` + real `source_url` (write to `server/src/db/seed-claims.json` first — see `project_context.md` for the list pattern)
- [ ] **50 fake users** — varied display names, avatars (use `https://i.pravatar.cc/150?u=N` for stable avatars), points distribution `[0..500]`
- [ ] **1 demo user** — `email = demo@truthloop.app`, `is_admin = true`, points ~120, google_id NULL but uniquely identifiable by email
- [ ] **200+ guesses** — distributed: each fake user has 4–8 guesses, mix of correct/wrong, distributed across last 14 days
- [ ] **30+ comments** — some top-level, some replies (1-level only for v1, full nesting later)
- [ ] **8 badges** seeded into `badges` (per `.ai/04-data-model.md` §2.10)
- [ ] **10+ user_badges** — distribute across fake users
- [ ] **2–3 scam_forecasts** — yesterday + today + day-before-yesterday, 3 items each
- [ ] **1 weekly_report** for demo account — `total_guesses = 16`, `correct_guesses = 12`, blind spot `manipulated_stat`, replay claim
- [ ] **5 notifications** for demo account — mix of read/unread, varied types

**1.6 Update config (`server/src/config/index.ts`)**

- [ ] Add `jwtSecret`, `jwtExpiresIn` (default `'7d'`)
- [ ] Add `anthropicApiKey`, `anthropicDefaultModel`, `anthropicStrongModel`
- [ ] Add `resendApiKey`, `emailFrom`
- [ ] Add `corsOrigin`, `frontendUrl`
- [ ] Add `cronTimezone` (UTC), `cronEnabled` (false in test)

**1.7 Update `.env.example`**

```bash
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/truthloop
JWT_SECRET=change-me
SESSION_SECRET=change-me
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
FRONTEND_URL=http://localhost:5173
ANTHROPIC_API_KEY=
RESEND_API_KEY=
EMAIL_FROM=noreply@truthloop.app
CORS_ORIGIN=http://localhost:5173
```

**✅ Demo gate**: `npm run db:migrate && npm run db:seed` succeeds; `psql` shows 10 tables populated.

---

### **Phase 2 — Auth: Google-only + JWT cookie** (Hour 2–4)  ·  Demo gate: sign in works, JWT cookie issued

> Current code uses session cookies + has email/password. We migrate to **JWT-only** (spec says Google OAuth, no passwords) — simpler, better for SSE, fewer surface area bugs.

**2.1 Install**

```bash
npm i jsonwebtoken cookie-parser @anthropic-ai/sdk resend @react-email/components node-cron zod
npm i -D @types/jsonwebtoken @types/cookie-parser
```

**2.2 Rewrite [`server/src/routes/auth.ts`](../server/src/routes/auth.ts)**

- [ ] Delete LocalStrategy + `passport-local` (passwords out)
- [ ] Keep Google OAuth strategy (already wired)
- [ ] Replace session cookie with **JWT in HttpOnly cookie** (`token=<jwt>`)
- [ ] `POST /api/auth/logout` — clear cookie
- [ ] `GET /api/auth/me` — decode JWT from cookie, fetch fresh user row, return
- [ ] On OAuth callback: upsert user (Google profile), sign JWT, set cookie, **redirect to `FRONTEND_URL/?welcome=true`**
- [ ] First-time user flow: insert into `users` + auto-create `user_settings` row

**2.3 New middleware: `server/src/middleware/requireAuth.ts`**

```ts
export function requireAuth(req, res, next) {
  const token = req.cookies?.token ?? bearerHeader(req);
  if (!token) throw new AppError(401, 'Not signed in');
  req.user = verifyJwt(token);   // sets { id, email, is_admin }
  next();
}
```

- [ ] `requireAdmin` — checks `req.user.is_admin`
- [ ] Mount `cookie-parser` **before** `requireAuth` in [`src/index.ts`](../server/src/index.ts)
- [ ] Drop `express-session` + `passport.session()` (only need `passport.initialize()` for the OAuth flow)

**2.4 Rate limiting**

- [ ] `server/src/middleware/rateLimit.ts` — `express-rate-limit` (default 60 req/min per IP)
- [ ] Stricter limit on `POST /api/submissions` (5 req/min)

**✅ Demo gate**: Visiting `/api/auth/google` redirects to Google → callback sets cookie → `GET /api/auth/me` returns the user.

---

### **Phase 3 — Core voting loop (Hour 4–8)**  ·  Demo gate: vote → verdict → points + badge

> Already 60% built. We harden + add gamification.

**3.1 Harden [`server/src/routes/claims.ts`](../server/src/routes/claims.ts)**

- [ ] `GET /api/claims` — add filters (`?category=`, `?verdict=`, `?q=` for full-text search), pagination (`?cursor=&limit=20`), only return `is_published = true`
- [ ] `GET /api/claims/:id` — **hide verdict if user hasn't voted yet** (per spec §2.3): response shape depends on `req.user`'s guess on this claim
- [ ] `POST /api/claims/:id/guess` — replace ad-hoc validation with `validateRequest(zodSchema)`, return **HTTP 409** if `UNIQUE(user_id, claim_id)` violated (idempotency path: re-fetch existing guess)
- [ ] `GET /api/users/:userId/report` — refactor to live under `/api/reports/weekly?userId=` + `POST /api/reports/weekly/regenerate` (per spec route map)

**3.2 New: gamification trigger module (`server/src/gamification/index.ts`)**

> Trigger from app code, not just DB triggers — easier to test, easier to evolve the rules.

- [ ] `evaluateBadgesOnGuess(userId, guessId)` — runs after every `POST /guess`:
  - insert `first-guess` if `count(guesses WHERE user_id) === 1`
  - `truth-teller` if last 5 guesses all `is_correct`
  - update `streak_days` + `last_active_date`
  - `on-a-roll` (3-day streak), `weekly-warrior` (7-day)
  - returns array of newly-earned badges (so route returns them to frontend for animation)
- [ ] `evaluateBadgesOnSubmission(userId)` — `fact-checker` at 5 verified submissions
- [ ] `evaluateBadgesOnForecastResolution(itemId)` — `scam-hunter` when a "believe" vote proves accurate
- [ ] `evaluateBadgesOnLeaderboard()` — daily cron inserts `top-10` for users in top 10

**3.3 Leaderboard query**

- [ ] New file `server/src/routes/leaderboard.ts`
- [ ] `GET /api/leaderboard?scope=daily|all-time`
- [ ] Daily: SQL from `.ai/04-data-model.md` §5.2
- [ ] All-time: `SELECT id, display_name, avatar_url, points FROM users WHERE NOT is_admin ORDER BY points DESC LIMIT 50`
- [ ] Always include **requesting user's rank** (even if outside top 50): `"your_rank": 127`

**3.4 Notifications trigger on guess**

- [ ] After correct guess, insert `notifications` row (`badge_earned` if any) for the user
- [ ] SSE emit on `user:{userId}` channel

**✅ Demo gate**: Vote on 3 claims → coin count goes up → "First Guess" badge animates in → leaderboard refreshes.

---

### **Phase 4 — Comments + toxicity (Hour 8–12)**  ·  Demo gate: post comment + 1-level reply, slur rejected

**4.1 Comments routes (`server/src/routes/comments.ts`)**

- [ ] `GET /api/claims/:id/comments` — fetch all comments for a claim, return flat list with `parent_comment_id` (frontend assembles tree for v1; full recursive rendering later)
- [ ] `POST /api/claims/:id/comments` — body `{ body, parent_comment_id? }`, runs through AI toxicity check first, persists or 403
- [ ] `POST /api/comments/:id/vote` — body `{ vote: 'up' | 'down' }`, upsert into `comment_votes`, recompute `comments.upvotes` + `downvotes`
- [ ] `PATCH /api/comments/:id` — edit within 5 minutes
- [ ] `DELETE /api/comments/:id` — soft delete (`is_deleted = true`, body → `[deleted]`)

**4.2 AI client wrapper (`server/src/ai/client.ts`)**

> Single source of truth for *all* Claude calls. This is the abstraction every prompt uses.

```ts
export async function callClaude<T>(opts: {
  model: 'sonnet' | 'opus';
  systemPrompt: string;
  userPrompt: string;
  schema: z.ZodSchema<T>;
  maxTokens?: number;     // default 1024
  timeoutMs?: number;     // default 2000 sonnet, 5000 opus
}): Promise<T>;
```

Behavior:
- [ ] Map `'sonnet' → 'claude-sonnet-4-5'`, `'opus' → 'claude-opus-4-1'`
- [ ] Always wrap user input in `<user_input>...</user_input>` tags (helper, not just convention)
- [ ] Retry **once** on JSON parse failure (Claude can drift out of JSON mode)
- [ ] On timeout / 3rd failure → throw `AIError` with category + fallback value
- [ ] JSON-mode via Anthropic tool use (more deterministic than prompt-only)

**4.3 Toxicity prompt (`server/src/ai/prompts/toxicity.ts`)**

- [ ] System prompt + user prompt wrapper from `.ai/05-ai-prompts.md` §3
- [ ] Zod schema in `server/src/ai/schemas.ts`
- [ ] Fallback: `{ score: 0.3, reasons: [], action: 'accept' }` (when in doubt, accept — moderators clean later)
- [ ] Wire into `POST /api/comments` — **block if `action === 'reject'`** (403), pass through + mark `is_flagged = true` if `action === 'flag'`

**✅ Demo gate**: Post a benign comment → appears. Post a slur → 403 with the right message. Reply to a comment → nested thread.

---

### **Phase 5 — AI prompts library (Hour 12–14)**  ·  Demo gate: all 4 prompts callable from REPL/test

**5.1 Folder structure** (per `.ai/05-ai-prompts.md` §6)

```
server/src/ai/
  client.ts
  errors.ts
  schemas.ts
  prompts/
    scamForecast.ts
    liveFactCheck.ts
    toxicity.ts
    weeklyNarrative.ts
```

**5.2 Per-prompt checklist**

For each of the 4 prompts:

- [ ] System prompt (exact text from `.ai/05-ai-prompts.md`)
- [ ] User prompt builder (templates the inputs)
- [ ] Zod schema in `schemas.ts`
- [ ] Fallback response (per `.ai/05-ai-prompts.md` §6)
- [ ] Unit-test file in `server/src/ai/prompts/__tests__/<name>.test.ts` with **mock Claude response** + assert Zod parse succeeds + fallback path

**5.3 Prompt caching**

- [ ] For `scamForecast` + `weeklyNarrative` — enable Anthropic prompt caching on the system prompt (large, mostly static). Saves ~80% of input cost on the cron.

**5.4 Cost guard**

- [ ] Every call wrapped in `Promise.race` with timeout
- [ ] `max_tokens` always set (no runaway completions)
- [ ] Per-IP daily quota on `/api/submissions` (max 20/day)

**✅ Demo gate**: Each prompt callable in isolation, returns parsed Zod object, fallback works when API key is invalid.

---

### **Phase 6 — Scam Forecast (Hour 14–18)**  ·  Demo gate: forecast card renders, voting works, cron runs

**6.1 Routes (`server/src/routes/forecast.ts`)**

- [ ] `GET /api/forecast/today` — fetch forecast for `forecast_date = CURRENT_DATE (UTC)`, lazy-generate if missing (per `.ai/02-business-logic.md` §3.5 fallback)
- [ ] `POST /api/forecast/:itemId/vote` — body `{ vote: 'believe' | 'doubt' | 'skip' }`, upsert into `forecast_votes`, increment tally on `scam_forecast_items`
- [ ] `GET /api/forecast/:itemId/results` — fetch resolution if `resolved_at IS NOT NULL`

**6.2 Generation module (`server/src/services/forecastGenerator.ts`)**

- [ ] `generateScamForecast(date: string, region = 'global')` — calls Claude, parses via Zod, returns 1–3 items (pad with fallback if Claude returns <1)
- [ ] Optional RSS feed reader — fetch BBC + Reuters + Al Jazeera headlines (use `rss-parser` if time, else hardcode 5–10 sample headlines for demo)
- [ ] `storeForecast(items, date)` — INSERT into `scam_forecasts` + `scam_forecast_items`, broadcast SSE, queue high-severity instant-alert emails

**6.3 Scheduled job (`server/src/jobs/scamForecast.ts`)**

- [ ] `node-cron` `'0 6 * * *'` (06:00 UTC daily)
- [ ] Calls `generateScamForecast(today)` → `storeForecast(...)`
- [ ] Manual trigger route `POST /api/admin/forecast/regenerate` (admin only — for demo when judges ask "can we see what it looks like now?")

**6.4 SSE event**

- [ ] On store: `bus.emit('scam-forecast', { date, items })`
- [ ] Frontend listens, updates live if user is on `/forecast`

**✅ Demo gate**: `/forecast` page shows today's card, voting updates tally live, manual cron trigger works.

---

### **Phase 7 — Submissions + Live Fact-Check (Hour 18–20)**  ·  Demo gate: paste fake headline → AI catches it <3s

> First cuttable if running behind, but cheap once the AI client is built.

**7.1 Routes (`server/src/routes/submissions.ts`)**

- [ ] `POST /api/submissions` — body `{ text }` (1–1000 chars), calls `liveFactCheck` prompt, INSERT into `user_submissions`, award 5 points if user has <20 submissions today, run `evaluateBadgesOnSubmission`
- [ ] `GET /api/submissions/me` — list user's submissions (paginated)

**7.2 Prompt wiring**

- [ ] `liveFactCheck.ts` — `.ai/05-ai-prompts.md` §2, model `opus`
- [ ] Fallback: `{ verdict: 'unverifiable', confidence: 0, explanation: 'AI check unavailable — try again', sources: [], category: 'unverified_claim' }`

**✅ Demo gate**: Paste "The Great Barrier Reef has never experienced mass bleaching events" → AI returns `verdict: 'fake'` + explanation.

---

### **Phase 8 — Weekly blind-spot report (Hour 20–24)**  ·  Demo gate: demo account's report is pre-seeded + regeneration works

**8.1 Routes (`server/src/routes/reports.ts`)**

- [ ] `GET /api/reports/weekly?weekId=ISO_DATE` — fetch most recent report for current user
- [ ] `POST /api/reports/weekly/regenerate` — recompute from last 7 days of guesses, overwrite stored report
- [ ] `GET /api/reports/weekly/:weekId` — historical reports

**8.2 Report generator (`server/src/services/reportGenerator.ts`)**

- [ ] `generateWeeklyReport(userId, weekStarting: Date)`:
  - SQL: accuracy, blind-spot category (most-missed), global avg, top 5 missed claims, top 3 strongest categories
  - Call `weeklyNarrative` prompt with the computed stats
  - Pick replay claim: `WHERE user was wrong AND longest time-to-vote` (or just most recently wrong in v1)
  - INSERT into `weekly_reports`
- [ ] `runWeeklyReportCron()` — Sunday 00:00 UTC, iterates all `users` with ≥1 guess in past 7 days, calls generator for each, queues email

**8.3 Scheduled job (`server/src/jobs/weeklyReport.ts`)**

- [ ] `node-cron` `'0 0 * * 0'` (Sunday midnight UTC)
- [ ] Calls `runWeeklyReportCron()`
- [ ] Manual trigger `POST /api/admin/reports/run-now` (admin only)

**8.4 Refactor existing route**

- [ ] Move `GET /users/:userId/report` → `GET /api/reports/weekly` (uses current user's id from JWT, not URL param)
- [ ] Keep the pre-seeded `weekly_reports` row for `demo@truthloop.app` (don't auto-regenerate over it)

**✅ Demo gate**: Visit `/reports/weekly` as demo account → 3-section card with 12/16 accuracy, blind-spot narrative, replay claim.

---

### **Phase 9 — Realtime (SSE) + Notifications + Email (Hour 24–28)**  ·  Demo gate: 2 tabs update in <2s, email path verified

> First feature to **cut** if time-pressed (fallback: polling every 10s). Spec marks SSE as non-negotiable though, so we ship it.

**9.1 SSE broadcaster (`server/src/sse/broadcaster.ts`)**

- [ ] In-process `EventEmitter` (`bus`) — `setMaxListeners(1000)`
- [ ] `broadcast(channel, data)` helper
- [ ] Channels: `claim:{claimId}`, `scam-forecast`, `leaderboard:daily`, `user:{userId}`

**9.2 SSE route (`server/src/routes/sse.ts`)**

- [ ] `GET /api/sse/connect` (auth required) — sets headers `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`
- [ ] Subscribe to channels the user is authorized for: `user:{id}`, `scam-forecast`, `leaderboard:daily`, `claim:{ids user has open}`
- [ ] Heartbeat `:\n\n` every 30s
- [ ] On `req.close` → `bus.off(...)` + clear heartbeat

**9.3 Notification triggers**

- [ ] On badge earn → INSERT `notifications` + `bus.emit('user:{id}', { notification })`
- [ ] On reply to user's comment → INSERT + emit
- [ ] On new scam forecast (high severity) → INSERT for all users with `email_instant_alerts_enabled`

**9.4 Email service (`server/src/email/client.ts`)**

- [ ] Resend wrapper: `sendEmail({ to, subject, reactComponent })`
- [ ] `react-render` the React Email component to HTML, pass to Resend
- [ ] Rate-limited to 100/sec (Resend's limit)

**9.5 Email templates (`server/src/email/templates/`)**

- [ ] `WeeklyReport.tsx` — 3 sections, "View full report" CTA button
- [ ] `ScamForecastAlert.tsx` — high-severity, "See today's forecast" CTA
- [ ] `DailyDigest.tsx` — yesterday's rank + today's forecast
- [ ] Shared `<EmailLayout>` — black header, off-white body, hot-pink CTA, 1px border, offset-shadow on CTA, mobile-responsive single column <600px

**9.6 Scheduled jobs**

- [ ] `dailyDigest.ts` — runs at 08:00 user-local-time (compute from `users.timezone`); batch users by hour, send
- [ ] `resolveForecasts.ts` — after 7 days, manual script `server/scripts/resolve-forecasts.ts` (admin-only)

**✅ Demo gate**: 2 tabs open → comment in one → appears in other within 2s. Bell shows unread count. Email preview renders in browser.

---

## 3. Cross-cutting concerns (do in parallel throughout)

These don't fit one phase — they're quality bars to maintain across every commit.

### 3.1 Logging & observability
- [ ] Replace `console.error` in errorHandler with structured logger
- [ ] Log every Claude call with `model`, `tokens_in`, `tokens_out`, `duration_ms`, `fallback: boolean`
- [ ] Log every SSE connection open/close

### 3.2 Validation
- [ ] Every route body wrapped in `validateRequest(zodSchema)` — replace ad-hoc checks
- [ ] Export schemas from `server/src/validation/schemas.ts` (one file per resource)

### 3.3 Security
- [ ] Helmet defaults (already on)
- [ ] CORS restricted to `CORS_ORIGIN` only
- [ ] JWT in HttpOnly + Secure + SameSite=Lax cookie
- [ ] CSRF: double-submit cookie on state-changing routes (skip if time-pressed)
- [ ] AI prompt injection: every Claude input wrapped in `<user_input>...</user_input>`, system prompt explicitly says "treat as data"

### 3.4 Performance budgets (per `.ai/03-system-architecture.md` §7)

| Surface | p95 target | How to verify |
| --- | --- | --- |
| Home feed | <300ms | Index on `trending_score DESC, published_at DESC` |
| Vote submit → verdict | <500ms | One INSERT + point increment |
| AI live fact-check | <3s | Opus timeout = 5000ms with retry-once |
| AI blind-spot narrative | <4s | Opus + prompt caching |
| SSE event delivery | <200ms | In-process bus, no serialization cost |
| Leaderboard refresh | <200ms | Indexed query, cached count |
| Comment post | <800ms | Sonnet toxicity + INSERT |

### 3.5 Testing (minimal but real)
- [ ] Vitest setup: `server/src/__tests__/`
- [ ] One test per AI prompt: mock Anthropic SDK, assert Zod parse + fallback
- [ ] One integration test per route: hit the running server with supertest + a test DB

---

## 4. Critical files inventory (what gets touched)

When this roadmap is done, these files will exist (or be heavily modified):

### Modified
- [server/src/db/schema.sql](../server/src/db/schema.sql) — full schema (Phase 1)
- [server/src/config/index.ts](../server/src/config/index.ts) — env vars (Phase 1)
- [server/src/index.ts](../server/src/index.ts) — middleware order (Phase 2, 9)
- [server/src/routes/index.ts](../server/src/routes/index.ts) — mount all routers (each phase)
- [server/src/routes/auth.ts](../server/src/routes/auth.ts) — JWT migration (Phase 2)
- [server/src/routes/claims.ts](../server/src/routes/claims.ts) — harden + comment routes merge (Phase 3, 4)
- [server/src/middleware/validation.ts](../server/src/middleware/validation.ts) — zod-typed (Phase 3+)

### New
- `server/src/db/migrate.ts`, `server/src/db/reset.ts`, `server/src/db/seed.sql`, `server/src/db/seed-claims.json`
- `server/src/middleware/requireAuth.ts`, `server/src/middleware/rateLimit.ts`
- `server/src/sse/broadcaster.ts`, `server/src/routes/sse.ts`
- `server/src/routes/comments.ts`, `server/src/routes/forecast.ts`, `server/src/routes/leaderboard.ts`, `server/src/routes/submissions.ts`, `server/src/routes/reports.ts`, `server/src/routes/notifications.ts`, `server/src/routes/admin.ts`
- `server/src/services/forecastGenerator.ts`, `server/src/services/reportGenerator.ts`
- `server/src/gamification/index.ts`
- `server/src/ai/client.ts`, `server/src/ai/errors.ts`, `server/src/ai/schemas.ts`
- `server/src/ai/prompts/{scamForecast,liveFactCheck,toxicity,weeklyNarrative}.ts`
- `server/src/jobs/{scamForecast,weeklyReport,dailyDigest}.ts`, `server/src/jobs/scheduler.ts`
- `server/src/email/client.ts`, `server/src/email/templates/{WeeklyReport,ScamForecastAlert,DailyDigest,EmailLayout}.tsx`
- `server/src/validation/schemas.ts`

**Net: ~35 new files, ~6 modified.**

---

## 5. Demo-time acceptance (per feature)

Run through `.ai/02-business-logic.md` §11 before declaring done:

| Feature | Backend pass criteria |
| --- | --- |
| Voting | `POST /api/claims/:id/guess` returns verdict + points + new badges; `GET /api/claims/:id` hides verdict pre-vote |
| Scam Forecast | `GET /api/forecast/today` returns 1–3 items; `POST /api/forecast/:id/vote` updates tally; manual cron trigger works |
| Comments | `POST /api/comments` rejects slur with 403, accepts normal, threaded response includes parent |
| Toxicity filter | Toxicity prompt hits accept / flag / reject thresholds correctly |
| Badges | First-guess badge awarded on first vote; truth-teller at 5-in-a-row correct |
| Leaderboard | Daily query returns top 50 + user's rank; live SSE updates on vote |
| Weekly report | Demo account has pre-seeded report; regen recomputes correctly |
| Email | Sending to demo address works; React Email template renders |
| Real-time | Open SSE in 2 tabs, post comment → other tab updates <2s |
| OAuth | Sign in with Google succeeds, JWT cookie set, `/api/auth/me` returns user |

---

## 6. Cut order (re-stated for backend context)

If running out of time, **cut in this order** without breaking the demo:

1. **`POST /api/submissions` + live fact-check** — pre-seed the feed; submit tab becomes "coming soon"
2. **Email send (Resend)** — replace with in-app notifications only; comment out cron
3. **SSE** — switch `useSSE` hook on frontend to poll every 10s; remove `bus.emit` calls
4. **Full nested comments** — restrict to 1 level of replies (just sort by `parent_comment_id` and render flat)
5. **All-time leaderboard** — remove the `all-time` tab from `/api/leaderboard?scope=` (returns 400)
6. **4 of 8 badges** — keep `first-guess`, `truth-teller`, `on-a-roll`, `top-10`; drop the rest from the seed
7. **Weekly report regen on-demand** — remove `POST /api/reports/weekly/regenerate`; rely on Sunday cron

**Never cut**:
1. Voting loop (auth + POST /guess + verdict reveal)
2. Weekly blind-spot report (pre-seeded)
3. Scam Forecast (1+ AI-generated item)
4. Comments (1 level)
5. Daily leaderboard
6. Gumroad design polish (backend has no direct role here but no errors block it)

---

## 7. Deployment checklist (last 4 hours)

- [ ] Railway Postgres created, `DATABASE_URL` set in Railway env
- [ ] Run `npm run db:migrate` against Railway DB
- [ ] Run `npm run db:seed` against Railway DB
- [ ] Backend deployed to Railway (NOT Vercel — SSE incompatible)
- [ ] All env vars set in Railway: `JWT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, `CORS_ORIGIN`, `FRONTEND_URL`
- [ ] Frontend on Vercel with `VITE_API_URL` pointing to Railway
- [ ] Smoke test: open deployed URL → sign in → vote → see verdict → check leaderboard → check report
- [ ] Verify SSE: 2 tabs, post comment, see in other tab
- [ ] Send a real email via Resend to a test address, confirm render
- [ ] Demo account banner on every page (frontend); populated data visible

---

## 8. Post-hackathon v2 (for the pitch slide)

Don't build, but know what to say:

1. Live RSS claim ingestion + human review queue
2. Classroom mode (educator cohort, assigned claims)
3. Verified-organization accounts (newsrooms, fact-checkers)
4. Mobile app (React Native, reuse tokens + TanStack Query)
5. Multi-language (prompts are language-agnostic — easy port)
6. Premium tier (deeper history, custom feeds, API access)