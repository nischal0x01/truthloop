# 04 — Data Model

> Full Postgres schema. Extends the existing `claims` + `guesses` tables.
> Run `server/src/db/schema.sql` (extended) + `server/src/db/seed.sql` to bootstrap.

---

## 1. Entity-relationship diagram (text)

```
users ──┬──< guesses >── claims
        ├──< comments >── claims
        │       └──< comments (self-ref, parent_comment_id)
        ├──< comment_votes
        ├──< user_submissions
        ├──< user_badges >── badges
        ├──< forecast_votes >── scam_forecasts
        │                           └──< scam_forecast_items
        ├──< notifications
        ├──< weekly_reports
        └──< user_settings (1-1)
```

---

## 2. Tables (10 total)

### 2.1 `users`

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  google_id TEXT UNIQUE NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  streak_days INTEGER NOT NULL DEFAULT 0,
  last_active_date DATE,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  email_bounced BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_points ON users(points DESC);
CREATE INDEX idx_users_google_id ON users(google_id);
```

### 2.2 `user_settings` (1-1 with users)

```sql
CREATE TABLE user_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  email_digest_enabled BOOLEAN NOT NULL DEFAULT true,
  email_instant_alerts_enabled BOOLEAN NOT NULL DEFAULT true,
  email_digest_hour_local INTEGER NOT NULL DEFAULT 8, -- 0-23
  timezone TEXT NOT NULL DEFAULT 'UTC'
);
```

### 2.3 `claims` (extends existing)

The existing `claims` table is correct. Add indexes for the feed query.

```sql
-- (existing CREATE TABLE claims ...)

-- New columns for v2:
ALTER TABLE claims ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS trending_score REAL NOT NULL DEFAULT 0;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS vote_count INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_claims_published_trending
  ON claims(is_published, trending_score DESC, published_at DESC)
  WHERE is_published = true;

CREATE INDEX IF NOT EXISTS idx_claims_text_search
  ON claims USING gin(to_tsvector('english', text || ' ' || COALESCE(explanation, '')));
```

### 2.4 `guesses` (extends existing)

```sql
-- (existing CREATE TABLE guesses ...)

-- Add UNIQUE constraint for the one-vote-locked rule
ALTER TABLE guesses ADD CONSTRAINT guesses_user_claim_unique UNIQUE (user_id, claim_id);

CREATE INDEX IF NOT EXISTS idx_guesses_user_created ON guesses(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_guesses_claim ON guesses(claim_id);
```

### 2.5 `comments`

```sql
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) <= 2000 AND char_length(body) > 0),
  toxicity_score REAL,
  is_flagged BOOLEAN NOT NULL DEFAULT false,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  upvotes INTEGER NOT NULL DEFAULT 0,
  downvotes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_comments_claim_created ON comments(claim_id, created_at DESC);
CREATE INDEX idx_comments_parent ON comments(parent_comment_id) WHERE parent_comment_id IS NOT NULL;
CREATE INDEX idx_comments_user ON comments(user_id);
```

### 2.6 `comment_votes`

```sql
CREATE TABLE comment_votes (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  vote SMALLINT NOT NULL CHECK (vote IN (-1, 1)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, comment_id)
);

CREATE INDEX idx_comment_votes_comment ON comment_votes(comment_id);
```

### 2.7 `user_submissions`

```sql
CREATE TABLE user_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL CHECK (char_length(text) > 0 AND char_length(text) <= 1000),
  ai_verdict TEXT CHECK (ai_verdict IN ('real', 'fake', 'unverified')),
  ai_confidence SMALLINT CHECK (ai_confidence BETWEEN 0 AND 100),
  ai_explanation TEXT,
  ai_sources JSONB, -- [{url, title, snippet}]
  ai_category TEXT,
  is_toxic BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_submissions_user ON user_submissions(user_id, created_at DESC);
```

### 2.8 `scam_forecasts` and `scam_forecast_items`

```sql
CREATE TABLE scam_forecasts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  forecast_date DATE NOT NULL UNIQUE,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  generation_status TEXT NOT NULL DEFAULT 'success' CHECK (generation_status IN ('success', 'fallback', 'failed'))
);

CREATE TABLE scam_forecast_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  forecast_id UUID NOT NULL REFERENCES scam_forecasts(id) ON DELETE CASCADE,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  recommended_action TEXT,
  believe_count INTEGER NOT NULL DEFAULT 0,
  doubt_count INTEGER NOT NULL DEFAULT 0,
  skip_count INTEGER NOT NULL DEFAULT 0,
  resolved_at TIMESTAMPTZ,
  resolution_was_accurate BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_forecast_items_forecast ON scam_forecast_items(forecast_id, severity);
```

### 2.9 `forecast_votes`

```sql
CREATE TABLE forecast_votes (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  forecast_item_id UUID NOT NULL REFERENCES scam_forecast_items(id) ON DELETE CASCADE,
  vote TEXT NOT NULL CHECK (vote IN ('believe', 'doubt', 'skip')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, forecast_item_id)
);
```

### 2.10 `badges` and `user_badges`

```sql
CREATE TABLE badges (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL, -- emoji or asset path
  rarity TEXT NOT NULL DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary'))
);

CREATE TABLE user_badges (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_slug TEXT NOT NULL REFERENCES badges(slug) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, badge_slug)
);

-- Seed badges
INSERT INTO badges (slug, name, description, icon, rarity) VALUES
  ('first-guess', 'First Guess', 'Cast your first vote', '🎯', 'common'),
  ('truth-teller', 'Truth Teller', '5 correct guesses in a row', '✅', 'rare'),
  ('on-a-roll', 'On a Roll', 'Voted 3 days in a row', '🔥', 'common'),
  ('weekly-warrior', 'Weekly Warrior', 'Voted 7 days in a row', '⚡', 'rare'),
  ('scam-hunter', 'Scam Hunter', 'Upvoted a scam forecast that proved accurate', '🕵️', 'epic'),
  ('discussion-starter', 'Discussion Starter', 'Posted a comment with 3+ upvotes', '💬', 'common'),
  ('fact-checker', 'Fact-Checker', 'Submitted 5 claims, all AI-verified', '🔍', 'rare'),
  ('top-10', 'Top 10', 'Ranked in top 10 of the daily leaderboard', '🏆', 'epic');
```

### 2.11 `notifications`

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'new_claim', 'reply_to_comment', 'new_scam_forecast',
    'weekly_report_ready', 'badge_earned', 'leaderboard_rank_up'
  )),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link TEXT,
  metadata JSONB,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user_unread ON notifications(user_id, created_at DESC) WHERE is_read = false;
```

### 2.12 `weekly_reports`

```sql
CREATE TABLE weekly_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_starting DATE NOT NULL, -- Monday
  total_guesses INTEGER NOT NULL DEFAULT 0,
  correct_guesses INTEGER NOT NULL DEFAULT 0,
  blind_spot_category TEXT,
  blind_spot_narrative TEXT, -- AI-generated 1-sentence
  replay_claim_id UUID REFERENCES claims(id) ON DELETE SET NULL,
  global_average_accuracy REAL,
  user_accuracy REAL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, week_starting)
);

CREATE INDEX idx_weekly_reports_user ON weekly_reports(user_id, week_starting DESC);
```

---

## 3. Triggers (for points + badges)

```sql
-- On correct guess, increment points
CREATE OR REPLACE FUNCTION increment_points_on_correct_guess()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_correct THEN
    UPDATE users SET points = points + 10, updated_at = NOW() WHERE id = NEW.user_id;
    INSERT INTO user_badges (user_id, badge_slug)
      VALUES (NEW.user_id, 'first-guess')
      ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_increment_points
  AFTER INSERT ON guesses
  FOR EACH ROW EXECUTE FUNCTION increment_points_on_correct_guess();

-- On comment insert, check 'discussion-starter' badge
CREATE OR REPLACE FUNCTION check_discussion_starter_badge()
RETURNS TRIGGER AS $$
DECLARE
  upvote_count INTEGER;
BEGIN
  SELECT upvotes INTO upvote_count FROM comments WHERE id = NEW.id;
  IF upvote_count >= 3 THEN
    INSERT INTO user_badges (user_id, badge_slug)
      VALUES (NEW.user_id, 'discussion-starter')
      ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- (similar triggers for streak badges, fact-checker, etc. — implement in app code for clarity in 48h)
```

---

## 4. Seed data plan (heavy demo seed)

`server/src/db/seed.sql` should populate:

- **20 claims** (mix of real/fake, hand-written with category, explanation, source URL — see `02-business-logic.md` §2.2 for category list)
- **50 users** — fake Google profiles, varied display names, varied points (so leaderboard is alive)
- **200+ guesses** — distributed across all claims and users
- **30+ comments** — threaded (some replies), realistic content
- **8 badges** (the static definitions)
- **10+ user_badges** — distributed across the fake users
- **2-3 scam_forecasts** (yesterday, today, day before) with 3 items each
- **1 weekly_report** for the demo account — full 7-day stats, narrative, replay claim
- **5 notifications** (mix of read/unread) for the demo account
- **1 demo user** (`is_admin = true`, email `demo@truthloop.app`, points ~120, with all 8 badges, full week of guesses, the seeded weekly report)

> The demo account's state should look like a power user who's been playing for 2 weeks. Judges should immediately see the leaderboard, badges, weekly report, notifications — all populated.

---

## 5. Query patterns (for performance)

### 5.1 Home feed (trending claims)

```sql
SELECT c.*,
  (SELECT COUNT(*) FROM guesses WHERE claim_id = c.id) AS vote_count
FROM claims c
WHERE c.is_published = true
ORDER BY c.trending_score DESC, c.published_at DESC
LIMIT 20;
```

### 5.2 Daily leaderboard

```sql
SELECT u.id, u.display_name, u.avatar_url, u.points AS all_time_points,
  COALESCE(SUM(CASE WHEN g.is_correct THEN 10 ELSE 0 END), 0) AS points_today,
  COUNT(g.id) AS guesses_today
FROM users u
LEFT JOIN guesses g ON g.user_id = u.id
  AND g.created_at >= date_trunc('day', NOW() AT TIME ZONE 'UTC')
WHERE u.is_admin = false
GROUP BY u.id
HAVING COUNT(g.id) > 0
ORDER BY points_today DESC, guesses_today DESC
LIMIT 50;
```

### 5.3 Comments for a claim (single query with tree assembly)

```sql
SELECT c.*, u.display_name, u.avatar_url
FROM comments c
JOIN users u ON u.id = c.user_id
WHERE c.claim_id = $1 AND c.is_deleted = false
ORDER BY
  CASE WHEN c.parent_comment_id IS NULL THEN c.created_at END DESC,
  CASE WHEN c.parent_comment_id IS NOT NULL THEN c.created_at END ASC;
-- (assemble tree in app code, single level of nesting for v1 to keep SQL simple)
```

### 5.4 Blind-spot computation

```sql
SELECT c.category, COUNT(*) AS wrong_count
FROM guesses g
JOIN claims c ON c.id = g.claim_id
WHERE g.user_id = $1
  AND g.is_correct = false
  AND g.created_at >= $2 -- 7 days ago
GROUP BY c.category
ORDER BY wrong_count DESC
LIMIT 1;
```

---

## 6. Migrations strategy

For the 48-hour build, we use a **single `schema.sql` file** that is idempotent (`CREATE TABLE IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`). A real project would use Prisma/Drizzle migrations, but for the hackathon this is faster.

**File structure:**
```
server/src/db/
  schema.sql       # full DDL, idempotent
  seed.sql         # demo seed data
  reset.ts         # DROP everything + re-run schema + seed (dev only)
  migrate.ts       # run schema.sql
```

---

## 7. Data retention

For hackathon: keep everything forever (tiny dataset). For v2:
- Notifications older than 90 days: delete
- Comments older than 1 year: archive to cold storage
- Guesses: keep forever (they power the blind-spot report)
