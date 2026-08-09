# 02 — Business Logic

> Every feature, every rule, every edge case. This is the spec the engineering team builds against.

---

## 1. User identity & accounts

### 1.1 Sign-in

- **Method**: Google OAuth only. No email/password, no anonymous users.
- **Flow**: User clicks "Sign in with Google" → Google consent → backend creates `users` row + returns JWT in an HTTP-only cookie.
- **Why**: For a 48-hour build, OAuth removes all password reset / email verification / captcha concerns. Also makes email alerts trivially possible (we already have the verified email).

### 1.2 Profile (minimal for MVP)

Each user has:
- `id` (UUID)
- `email` (from Google)
- `display_name` (from Google, user can override)
- `avatar_url` (from Google)
- `points` (lifetime correct guesses × 10, cached)
- `streak_days` (consecutive days with ≥1 guess)
- `last_active_date` (date of last guess, for streak calc)
- `email_digest_enabled` (boolean, default true)
- `email_instant_alerts_enabled` (boolean, default true)
- `created_at`

> No bio, no follower count, no profile customization for MVP.

### 1.3 First-time experience

On first sign-in:
1. Show a 3-card onboarding carousel (Gumroad-style): "Vote on claims" → "Earn points + badges" → "Get your blind-spot report"
2. Land on home feed with 3 "starter" claims queued

---

## 2. Claims (the core voting unit)

### 2.1 Data shape

A `Claim` is a single statement (typically 1–3 sentences) with a known ground-truth verdict. Examples:

> "Mark Zuckerberg announced Facebook would rebrand to Meta at Connect 2021 on October 28."
> — verdict: **real** · category: `factual_statement`

> "ISRO successfully landed a rover on the Moon in 2019."
> — verdict: **fake** · category: `outdated_info`

### 2.2 Categories (drives the blind-spot report)

| Slug | Human-readable |
| --- | --- |
| `factual_statement` | Straight factual claim |
| `outdated_info` | Old news resurfaced as new |
| `misleading_omission` | True facts, missing context |
| `manipulated_stat` | Statistic cited inaccurately |
| `misattributed_quote` | Quote from wrong person |
| `satire_mistaken_as_real` | Satire/article misread as fact |
| `survey_stat` | Survey results cited out of context |
| `conspiracy_theory` | Conspiracy framing of real event |
| `misattributed_threat` | Risk/threat misattributed |
| `unverified_claim` | No source |

> **Why these matter**: The blind-spot report computes the category with the most wrong guesses. Categories must be honest, hand-labeled. Spend the 2 hours before coding writing the seed set well.

### 2.3 Voting rules

- **One vote per user per claim, locked**. No changing after.
- A user can vote on a claim they've already voted on **only** if their original vote hasn't been recorded yet (e.g. network failure retry) — idempotency key is the (user_id, claim_id) pair.
- Voting on a claim does **not** lock the user out of commenting.
- Verdict is hidden until the user votes. After voting, verdict + explanation + source link + category badge all appear.

### 2.4 Points

- Correct guess: **+10 points**
- Wrong guess: **0 points** (no penalty — keeps it fun, no demotivation)
- Submit a claim that gets verified by AI: **+5 points** (engagement incentive)

### 2.5 Submission tab ("Submit a claim" with live AI fact-check)

- User pastes a headline, link, or short paragraph (max 1000 chars)
- Backend calls `claude-opus-4-1` with the claim + web-search tool enabled (if available) OR pre-trained knowledge
- Returns: `{ verdict, confidence: 0-100, explanation, sources, category }`
- Submission is recorded in `user_submissions` table with the AI verdict
- A submission is **not** added to the main claim feed. It's only shown in the user's "My Submissions" tab.
- Optional upvote: a user can "promote" their own submission to the main feed if it gets ≥10 community upvotes (v2 — skip for hackathon, just show in "My Submissions")

### 2.6 Edge cases

- **User has already voted** → show their previous answer + verdict
- **Claim has no verdict yet** (rare, only during admin seeding) → hide from public feed
- **Claim text is very long** → truncate to 280 chars in feed, full text in detail view
- **Image attachment** → MVP: text only, image upload is v2

---

## 3. Scam Forecast (the unique differentiator)

### 3.1 What it is

A daily AI-generated card with 1–3 predicted scam patterns. Example:

> **Today's Scam Forecast** · 9 Aug 2026
>
> 🔴 **High risk** — "Festival discount" UPI scams expected to spike as Onam approaches in Kerala.
> 🟡 **Medium risk** — Fake airline ticket refund portals piggybacking on monsoon cancellation news.
> 🟢 **Low risk** — Crypto airdrop "verification" sites exploiting the new token launch hype.

### 3.2 Generation

- A scheduled job (Vercel Cron or `node-cron` on backend) runs daily at 06:00 UTC
- Calls `claude-sonnet-4-5` with: today's date, current trending topics from a small RSS feed (BBC, Reuters, Al Jazeera, The Himalayan Times for local flavor), recent known scam patterns from the last 7 days
- Returns a JSON array: `[{ severity, title, description, category, recommended_action }]`
- Stored in `scam_forecasts` table, one row per day
- Always returns 1–3 items (if Claude returns fewer, pad with "No new forecast today — stay vigilant")

### 3.3 Voting on forecasts

Each forecast item has a community vote: "I believe this" / "Don't buy it" / "Skip"
- Tally shown live (SSE)
- After 7 days, the forecast is marked "closed" and a resolution is added (was the prediction accurate?)
- Resolution is **manual** for hackathon (a script in `server/scripts/resolve-forecasts.ts`)

### 3.4 Email integration

- If user has `email_instant_alerts_enabled` AND a new forecast is "High risk", send email immediately
- If `email_digest_enabled`, include today's full forecast in the morning digest

### 3.5 Edge cases

- **Cron fails** → fallback: on first user visit of the day, generate if missing
- **Claude returns invalid JSON** → use 1 fallback forecast ("Stay vigilant — scams are rising globally")
- **Forecast contains harmful content** → add a moderation pass before storing (use the same toxicity filter as comments)

---

## 4. Comments (Reddit-style nested)

### 4.1 Data model

```
Comment
  - id, claim_id, parent_comment_id (nullable), user_id, body, created_at, updated_at, is_deleted, toxicity_score
```

### 4.2 Nesting

- Unlimited nesting depth (visually collapse beyond 5 levels)
- Top-level comments sorted by `created_at DESC` (newest first)
- Replies sorted by `created_at ASC` (oldest first — threaded reading order)
- Vote on each comment: upvote / downvote (one vote per user per comment, changeable)

### 4.3 Moderation

- **Every** new comment is sent to Claude with the toxicity-check prompt before being persisted
- If `toxicity_score > 0.7` → reject with 403, show "Your comment was flagged as potentially harmful"
- If `0.4 < score ≤ 0.7` → accept but show with a "Flagged" yellow badge, allow user-reported re-check
- If `score ≤ 0.4` → accept normally

### 4.4 Editing / deleting

- Edit allowed for 5 minutes after creation
- Delete is soft (`is_deleted = true`, body replaced with "[deleted]" but tree structure preserved)

### 4.5 Edge cases

- **User comments on a claim they haven't voted on** → allowed (encourages discussion)
- **User comments on a submission** → MVP: only claims have comments
- **Comment body too long** → max 2000 chars
- **Replies to deleted comments** → allowed (orphans, but tree is preserved)

---

## 5. Gamification (Points, Badges, Leaderboards)

### 5.1 Points

Tracked on `users.points` (cached, recomputed from `guesses` periodically). For 48-hour build, just maintain on each guess write.

Display: in the top nav as a coin icon + number, animated to bounce +1 on correct guess.

### 5.2 Badges (8 for MVP)

| Badge | Trigger | Icon |
| --- | --- | --- |
| First Guess | 1st guess submitted | 🎯 |
| Truth Teller | 5 correct in a row | ✅ |
| On a Roll | 3-day streak | 🔥 |
| Weekly Warrior | 7-day streak | ⚡ |
| Scam Hunter | Upvoted 1 scam forecast that proved accurate | 🕵️ |
| Discussion Starter | 1 comment with ≥3 upvotes | 💬 |
| Fact-Checker | Submitted 5 claims, all verified by AI | 🔍 |
| Top 10 | Landed in top 10 of daily leaderboard | 🏆 |

Badges stored in `user_badges` table, awarded via Postgres trigger on `guesses` insert and a daily leaderboard-computation job.

### 5.3 Daily Leaderboard

- Cadence: **Daily** (resets at 00:00 UTC, with **All-time** tab as second view)
- Metric: **points earned today** for Daily, **lifetime points** for All-time
- Top 50 shown
- User's own rank shown even if outside top 50 ("You are #127 today")
- Recomputed on every vote insert (cached query)

### 5.4 Edge cases

- **Tied scores** → tiebreak by earliest correct guess
- **User with 0 votes today** → don't show on daily leaderboard
- **Bot/spam votes** → trust the OAuth email verification for hackathon; production would need more

---

## 6. Weekly Blind-Spot Report

### 6.1 What it is

A 3-section report generated every Sunday 00:00 UTC for the past 7 days. Replaces the "single card" from the original spec because the user has expanded scope, but keeps the same 3-section spirit.

### 6.2 Content (3 sections, no more)

1. **Accuracy** — "You got 12/16 right this week (75%)"
2. **Your blind spot** — one sentence: "You're most often fooled by `manipulated_stat` claims" (Claude-written narrative based on the user's most-missed category, with comparison to global average)
3. **One replay** — the single claim the user got most clearly wrong (longest time-to-vote OR highest community agreement that user was wrong), shown again with its full explanation

### 6.3 Generation

- Sunday 00:00 UTC cron: for each user who voted ≥1 time in past 7 days, generate report
- Uses `claude-opus-4-1` with a fixed prompt + the user's guess history
- Stored in `weekly_reports` table
- Email sent to all users with `email_digest_enabled = true`

### 6.4 On-demand regeneration

User can click "Regenerate" on the report page → recomputes from last 7 days, overwrites stored report.

### 6.5 Edge cases

- **User has <3 guesses** → show "Keep voting to unlock your blind-spot report"
- **User has no wrong guesses** → "Perfect week — your blind spot is the empty set"
- **No data for a category** → skip, use the next most-missed

---

## 7. Notifications & Email Alerts

### 7.1 In-app (always on)

- Bell icon in top nav with unread count badge
- Types: `new_claim`, `reply_to_comment`, `new_scam_forecast`, `weekly_report_ready`, `badge_earned`
- User can mark all read, click into source

### 7.2 Email (Resend)

Two modes, user-controlled:

**Daily digest** (default 08:00 local time, computed from user's timezone via Google profile)
- Yesterday's leaderboard position
- New claims from past 24h (top 5)
- Today's scam forecast
- This week's blind-spot report (if Sunday)

**Instant alerts** (immediate, only for High severity)
- New High-risk scam forecast
- Weekly report ready
- (Optional v2) When a claim the user voted on is re-verified/changed

### 7.3 Email template

React Email template matching Gumroad design: black header, off-white body, hot-pink CTA button, 1px border, offset shadow on CTA. Mobile-responsive (single column <600px).

### 7.4 Edge cases

- **Email bounces** → Resend handles, mark user `email_bounced = true`, stop sending
- **User has no email** → not possible (Google OAuth guarantees one)
- **User unsubscribes** → Resend unsubscribe link → mark all email flags false

---

## 8. Real-time (SSE)

### 8.1 Channels

- `claim:{claimId}` — new comments, vote tallies
- `scam-forecast` — new forecast posted, vote tally updates
- `leaderboard:daily` — rank changes
- `user:{userId}` — personal notifications, badge earned, weekly report ready

### 8.2 Connection management

- Frontend opens an `EventSource` on login, closes on logout
- Server keeps connections in-memory, broadcasts via an in-process EventEmitter
- Heartbeat every 30s to keep alive through proxies

### 8.3 Edge cases

- **Server restart** → frontend reconnects automatically (EventSource handles)
- **Multiple tabs** → one EventSource per tab is fine for hackathon; v2 would dedupe per user
- **Vercel serverless** → SSE doesn't work on Vercel. Backend must be on Railway/Render/Fly for SSE to function.

---

## 9. Search & Discovery (minimal)

- Search bar in nav → queries `claims.text` and `claims.explanation` (full-text, Postgres `tsvector`)
- Filter by category, verdict, date
- Sort by: newest, most-voted, most-controversial (50/50 split)
- "Trending" feed = top 10 by votes in last 24h

---

## 10. Admin / Moderation (skip for MVP)

For the hackathon, the demo account has admin powers (checked via `users.is_admin`). No UI in v1, just SQL.

---

## 11. Acceptance criteria per feature (for the demo to pass)

| Feature | Demo passes if... |
| --- | --- |
| Voting | A new user can sign in, vote on a claim, see the verdict + explanation |
| Scam Forecast | A user can see today's forecast, vote on an item, see tally update live |
| Comments | A user can post a top-level comment, reply, and see threading |
| Toxicity filter | A user posting a slur gets a 403 with the right message |
| Badges | After 1 correct guess, the "First Guess" badge animates in |
| Leaderboard | Daily tab shows ≥10 users, All-time tab shows ≥10 users, live rank update works |
| Weekly report | The demo account's report is pre-seeded with 12/16 accuracy, a real blind-spot, a replay claim |
| Email | Sending a test email to the demo address works (no real send during pitch, but the path is verified) |
| Real-time | Opening two browser tabs, posting a comment in one shows it in the other within 2s |
| OAuth | Sign in with Google works on the deployed URL |
| Design | All screens match the Gumroad tokens (off-white bg, black text, hot-pink CTA, ABC Favorit or Inter fallback) |
