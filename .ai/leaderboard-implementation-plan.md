# Leaderboard Implementation Plan

## Context

The frontend leaderboard UI is fully built (`app/src/pages/Leaderboard.tsx` + `app/src/components/leaderboard/`) with hardcoded dummy data. Every component has explicit TypeScript prop interfaces documenting the exact API response shapes needed. The backend has **no leaderboard routes** and the database has **no daily-points tracking** — points are cached on `users.points` (all-time only).

---

## Phase 1 — Database Schema (no new tables needed)

**Goal**: Ensure daily leaderboard queries are fast and correct.

The `guesses` table already has `created_at`. The daily leaderboard will be **derived on-the-fly** from `guesses` with a date filter — no new table or trigger required for the hackathon. Add one covering index so Postgres can answer the daily query in a single index scan.

### 1.1 Add a covering index for daily guesses

```sql
-- server/src/db/schema.sql (append)
CREATE INDEX IF NOT EXISTS idx_guesses_daily
  ON guesses(user_id, created_at DESC)
  INCLUDE (is_correct);
```

This lets Postgres answer "all correct guesses for user X today" without touching the main table heap.

### 1.2 Seed more realistic leaderboard data

The existing `LEADERBOARD_CAST` (6 users) in `server/src/db/seed.ts` is enough for dev but won't fill the top-50 visually. Add a script task to generate **50 seed users with varied point distributions** (spread across 0–500 points) so the leaderboard feels alive on cold load.

**Verify**: `SELECT COUNT(*), MAX(points), MIN(points) FROM users WHERE is_admin = false;`

---

## Phase 2 — Backend API Routes

**Goal**: Four new Express endpoints that satisfy the frontend prop interfaces exactly.

### File to create: `server/src/routes/leaderboard.ts`

#### `GET /api/leaderboard/daily`

Query: join `users` + `guesses` filtered to today UTC, sum correct-guess points (×10), count guesses, rank.

```sql
SELECT
  u.id,
  u.display_name,
  u.avatar_url,
  u.points AS all_time_points,
  COALESCE(SUM(CASE WHEN g.is_correct THEN 10 ELSE 0 END), 0) AS points_today,
  COUNT(g.id) AS guesses_today
FROM users u
LEFT JOIN guesses g ON g.user_id = u.id
  AND g.created_at >= date_trunc('day', NOW() AT TIME ZONE 'UTC')
  AND g.created_at < date_trunc('day', NOW() AT TIME ZONE 'UTC') + INTERVAL '1 day'
WHERE u.is_admin = false
GROUP BY u.id
HAVING COUNT(g.id) > 0
ORDER BY points_today DESC, guesses_today ASC
LIMIT 50;
```

Returns: `{ rank, name, avatar, points: points_today, streak?, badges?, isCurrentUser? }[]`

#### `GET /api/leaderboard/all-time`

```sql
SELECT
  u.id,
  u.display_name,
  u.avatar_url,
  u.points,
  u.streak_days
FROM users u
WHERE u.is_admin = false
ORDER BY u.points DESC, u.created_at ASC
LIMIT 50;
```

Returns: same shape as daily, but `points` = `all_time_points`.

#### `GET /api/leaderboard/me`

Returns the current user's rank in both daily and all-time scopes, plus accuracy stats.

```sql
-- daily rank subquery
WITH daily_scores AS (
  SELECT user_id, SUM(CASE WHEN is_correct THEN 10 ELSE 0 END) AS pts
  FROM guesses
  WHERE created_at >= date_trunc('day', NOW() AT TIME ZONE 'UTC')
    AND created_at < date_trunc('day', NOW() AT TIME ZONE 'UTC') + INTERVAL '1 day'
  GROUP BY user_id
)
SELECT
  (SELECT COUNT(*) + 1 FROM daily_scores WHERE pts > COALESCE($1.pts, 0)) AS daily_rank,
  (SELECT COUNT(*) + 1 FROM users WHERE points > (SELECT points FROM users WHERE id = $2) AND is_admin = false) AS all_time_rank,
  (SELECT COUNT(*) FROM guesses WHERE user_id = $2) AS total_guesses,
  (SELECT ROUND(SUM(CASE WHEN is_correct THEN 1 ELSE 0 END)::numeric / COUNT(*) * 100)
   FROM guesses WHERE user_id = $2) AS accuracy;
```

Returns: `{ dailyRank, allTimeRank, totalGuesses, accuracy }`.

#### `GET /api/leaderboard/activity`

Recent global events for `RecentActivityCard`.

```sql
SELECT
  'vote' AS type,
  u.display_name AS user_name,
  c.text AS target_text,
  g.is_correct,
  g.created_at
FROM guesses g
JOIN users u ON u.id = g.user_id
JOIN claims c ON c.id = g.claim_id
ORDER BY g.created_at DESC
LIMIT 20

UNION ALL

SELECT
  'badge' AS type,
  u.display_name AS user_name,
  b.name AS target_text,
  NULL AS is_correct,
  ub.earned_at AS created_at
FROM user_badges ub
JOIN users u ON u.id = ub.user_id
JOIN badges b ON b.slug = ub.badge_slug
ORDER BY ub.earned_at DESC
LIMIT 10
LIMIT 20;  -- top 20 mixed
```

Sort by `created_at DESC` in app code.

---

### File to create: `server/src/db/schema/leaderboard.ts`

Drizzle schema for any helper types (not new tables, just typed queries).

---

### File to update: `server/src/routes/index.ts`

```ts
import leaderboardRouter from './leaderboard';
router.use('/leaderboard', leaderboardRouter);
```

---

### Zod schemas to add: `server/src/ai/schemas.ts` (or a new `leaderboard.schemas.ts`)

```ts
import { z } from 'zod';

export const LeaderboardEntrySchema = z.object({
  rank: z.number(),
  name: z.string(),
  avatar: z.string().nullable(),
  points: z.number(),
  streak: z.number().optional(),
  badges: z.number().optional(),
  isCurrentUser: z.boolean().optional(),
});

export const DailyLeaderboardSchema = z.object({
  entries: LeaderboardEntrySchema.array(),
  userRank: z.number().nullable(),
  scope: z.literal('daily'),
});

export const AllTimeLeaderboardSchema = z.object({
  entries: LeaderboardEntrySchema.array(),
  userRank: z.number().nullable(),
  scope: z.literal('all-time'),
});

export const UserRankSchema = z.object({
  dailyRank: z.number(),
  allTimeRank: z.number(),
  totalGuesses: z.number(),
  accuracy: z.number(),
});

export const ActivityEntrySchema = z.object({
  id: z.string(),
  user: z.string(),
  action: z.enum(['voted on', 'earned badge']),
  target: z.string(),
  correct: z.boolean().nullable(),
  time: z.string(),
});
```

---

## Phase 3 — Points + Streak Trigger Logic

**Goal**: Keep `users.streak_days` and `users.last_active_date` correct as guesses come in.

The existing `increment_points_on_correct_guess` trigger only handles points. Extend it to also update `streak_days` and `last_active_date`.

### Replace `increment_points_on_correct_guess` trigger function

```sql
CREATE OR REPLACE FUNCTION update_streak_on_guess()
RETURNS TRIGGER AS $$
DECLARE
  prev_date DATE;
  expected_date DATE;
BEGIN
  -- Update last_active_date
  UPDATE users SET last_active_date = CURRENT_DATE WHERE id = NEW.user_id;

  -- Compute streak
  SELECT last_active_date INTO prev_date
    FROM users WHERE id = NEW.user_id;

  expected_date := CURRENT_DATE - INTERVAL '1 day';

  IF prev_date = CURRENT_DATE THEN
    -- same day, no streak change
    NULL;
  ELSIF prev_date = expected_date THEN
    -- consecutive day, increment streak
    UPDATE users SET streak_days = streak_days + 1 WHERE id = NEW.user_id;
  ELSE
    -- streak broken, reset to 1
    UPDATE users SET streak_days = 1 WHERE id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_streak ON guesses;
CREATE TRIGGER trg_update_streak
  AFTER INSERT ON guesses
  FOR EACH ROW EXECUTE FUNCTION update_streak_on_guess();
```

**Note**: This fires on **every** guess insert (not just correct ones). Combine with the existing `increment_points_on_correct_guess` which only fires on correct guesses.

---

## Phase 4 — "Top 10" Badge Awarding Logic

**Goal**: Award `top-10` badge after each daily leaderboard recompute.

Add a function called from a daily cron job (or after each vote via a lightweight check):

```sql
CREATE OR REPLACE FUNCTION award_top_10_badge()
RETURNS void AS $$
BEGIN
  INSERT INTO user_badges (user_id, badge_slug)
  SELECT u.id, 'top-10'
  FROM (
    SELECT g.user_id,
           RANK() OVER (ORDER BY SUM(CASE WHEN g.is_correct THEN 10 ELSE 0 END) DESC) AS daily_rank
    FROM guesses g
    WHERE g.created_at >= date_trunc('day', NOW() AT TIME ZONE 'UTC')
      AND g.created_at < date_trunc('day', NOW() AT TIME ZONE 'UTC') + INTERVAL '1 day'
    GROUP BY g.user_id
  ) ranked
  JOIN users u ON u.id = ranked.user_id
  WHERE ranked.daily_rank <= 10
  ON CONFLICT (user_id, badge_slug) DO NOTHING;
END;
$$ LANGUAGE plpgsql;
```

Call this from `POST /api/claims/:id/guess` after the guess insert (fire-and-forget, don't block the response):

```ts
// in the guess route handler, after successful insert:
db.query('SELECT award_top_10_badge()').catch(console.error);
```

Also call it from a daily cron at 23:59 UTC as a safety net.

---

## Phase 5 — Wire Frontend to API

**Goal**: Replace hardcoded data with live TanStack Query fetches.

### File to create: `app/src/api/leaderboard.ts`

```ts
import { query } from '@/lib/query';
import {
  DailyLeaderboardSchema,
  AllTimeLeaderboardSchema,
  UserRankSchema,
  ActivityEntrySchema,
} from '@/@types/leaderboard';

export function useDailyLeaderboard() {
  return useQuery({
    queryKey: ['leaderboard', 'daily'],
    queryFn: () =>
      query('/api/leaderboard/daily', { schema: DailyLeaderboardSchema }),
  });
}

export function useAllTimeLeaderboard() {
  return useQuery({
    queryKey: ['leaderboard', 'all-time'],
    queryFn: () =>
      query('/api/leaderboard/all-time', { schema: AllTimeLeaderboardSchema }),
  });
}

export function useMyLeaderboardRank() {
  return useQuery({
    queryKey: ['leaderboard', 'me'],
    queryFn: () =>
      query('/api/leaderboard/me', { schema: UserRankSchema }),
  });
}

export function useLeaderboardActivity() {
  return useQuery({
    queryKey: ['leaderboard', 'activity'],
    queryFn: () =>
      query('/api/leaderboard/activity', { schema: ActivityEntrySchema.array() }),
  });
}
```

### File to update: `app/src/pages/Leaderboard.tsx`

Replace the hardcoded `dailyLeaderboard` / `allTimeLeaderboard` / `recentActivity` constants with calls to the four hooks above. Map `isCurrentUser` by comparing `entry.id === user?.id`.

### File to update: `app/src/components/leaderboard/RecentActivityCard.tsx`

Map the API `type` ('vote'/'badge') to `action` ('voted on' / 'earned badge') and `correct` (true/false/null).

---

## Phase 6 — SSE for Live Rank Updates

**Goal**: When a user votes, broadcast leaderboard rank changes to all connected clients.

### Server — update the guess route

After a successful guess insert, emit to the `leaderboard:daily` channel:

```ts
import { bus } from '@/sse/broadcaster';

// after guess insert in POST /api/claims/:id/guess:
bus.emit('leaderboard:daily', { type: 'rank_changed', userId: req.user.id });
```

### Client — `useSSE` hook

Already exists at `app/src/hooks/useSSE.ts`. In `Leaderboard.tsx`, subscribe to `leaderboard:daily` and invalidate the `['leaderboard', 'daily']` query key on event:

```ts
useSSE('leaderboard:daily', () => {
  queryClient.invalidateQueries({ queryKey: ['leaderboard', 'daily'] });
});
```

---

## Phase 7 — Seed Data for Demo

**Goal**: Pre-seed 50 users with realistic point distributions so the leaderboard is populated on cold load.

Update `server/src/db/seed.ts`:
- Generate 50 synthetic users (faker names + avatars from `picsum.photos` or `ui-avatars.com`)
- Point distribution: power-law — top 5 users have 300–500 pts, middle 20 have 50–299, bottom 25 have 0–49
- 10 of these users have active streaks (1–14 days)
- A subset have 2–4 badges earned
- Add recent guesses spread across the last 3 days so the daily leaderboard is non-empty

This replaces the current `LEADERBOARD_CAST` of 6 users.

---

## Implementation Order

| Phase | What | Why |
|---|---|---|
| **1** | Covering index + check schema | Foundation; verify DB is ready |
| **2** | `GET /api/leaderboard/*` routes + Zod schemas | Core feature; unblocks frontend wiring |
| **3** | Streak trigger logic | Needed for leaderboard row UI (`streak_days`) |
| **4** | Top-10 badge awarding | Visible gamification payoff |
| **5** | Frontend API wiring | Replaces dummy data with live queries |
| **6** | SSE live updates | "Wow" factor for judges |
| **7** | Richer seed data | Visual impact on demo day |

---

## Key Files to Modify

| File | Change |
|---|---|
| `server/src/db/schema.sql` | Append covering index |
| `server/src/db/seed.ts` | Expand LEADERBOARD_CAST to 50 users |
| `server/src/routes/leaderboard.ts` | **New** — all 4 endpoints |
| `server/src/routes/index.ts` | Mount leaderboard router |
| `server/src/db/schema/leaderboard.ts` | **New** — Drizzle helpers |
| `server/src/ai/schemas.ts` | Add leaderboard Zod schemas |
| `app/src/api/leaderboard.ts` | **New** — TanStack Query hooks |
| `app/src/pages/Leaderboard.tsx` | Wire hooks, remove dummy data |
| `app/src/components/leaderboard/RecentActivityCard.tsx` | Map API fields to component props |
| `server/src/routes/claims.ts` | Add SSE broadcast after guess insert |

---

## Edge Cases

- **User with 0 votes today**: excluded from daily leaderboard (`HAVING COUNT(g.id) > 0`)
- **Tiebreak**: `ORDER BY points_today DESC, guesses_today ASC` — fewest guesses wins ties (fastest to that score)
- **All-time rank**: tiebreak by `users.created_at ASC` (earliest account wins)
- **Concurrent vote inserts**: the DB trigger is atomic; no race condition on `users.points`
- **SSE reconnection**: `EventSource` handles auto-reconnect; no extra code needed
