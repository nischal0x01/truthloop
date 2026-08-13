-- ──────────────────────────────────────────────────────────────────────────
-- TruthLoop — full database schema (10 tables + enums + triggers + indexes)
-- Idempotent: safe to re-run. Matches `src/db/schema/*.ts` (Drizzle schema).
-- Run:  psql $DATABASE_URL -f src/db/schema.sql
-- ──────────────────────────────────────────────────────────────────────────

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ════════════════════════════════════════════════════════════════════════
-- Enums
-- ════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  CREATE TYPE verdict AS ENUM ('real', 'fake');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ai_verdict AS ENUM ('real', 'fake', 'unverified');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE severity AS ENUM ('low', 'medium', 'high');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE forecast_vote AS ENUM ('believe', 'doubt', 'skip');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE rarity AS ENUM ('common', 'rare', 'epic', 'legendary');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM (
    'new_claim', 'reply_to_comment', 'new_scam_forecast',
    'weekly_report_ready', 'badge_earned', 'leaderboard_rank_up'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE forecast_status AS ENUM ('success', 'fallback', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE discussion_vote AS ENUM ('up', 'down');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ════════════════════════════════════════════════════════════════════════
-- users
-- ════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  google_id TEXT UNIQUE,
  -- Dev-only convenience — remove when JWT-only auth lands in Phase 2.
  password_hash TEXT,
  points INTEGER NOT NULL DEFAULT 0,
  streak_days INTEGER NOT NULL DEFAULT 0,
  last_active_date DATE,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  email_bounced BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_points ON users(points DESC);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

-- ────────────────────────────────────────────────────────────────────────
-- user_settings (1-1 with users)
-- ────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  email_digest_enabled BOOLEAN NOT NULL DEFAULT true,
  email_instant_alerts_enabled BOOLEAN NOT NULL DEFAULT true,
  email_digest_hour_local INTEGER NOT NULL DEFAULT 8,
  timezone TEXT NOT NULL DEFAULT 'UTC'
);

-- ════════════════════════════════════════════════════════════════════════
-- claims  (extends existing)
-- ════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS claims (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  text TEXT NOT NULL,
  verdict verdict NOT NULL,
  category TEXT NOT NULL,
  explanation TEXT NOT NULL,
  source_url TEXT,
  is_published BOOLEAN NOT NULL DEFAULT true,
  published_at TIMESTAMPTZ,
  trending_score REAL NOT NULL DEFAULT 0,
  vote_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Backfill v2 columns on legacy installs (idempotent).
ALTER TABLE claims ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS trending_score REAL NOT NULL DEFAULT 0;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS vote_count INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_claims_published_trending
  ON claims(is_published, trending_score DESC, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_claims_text_search
  ON claims USING gin(to_tsvector('english', text || ' ' || COALESCE(explanation, '')));

-- ════════════════════════════════════════════════════════════════════════
-- guesses  (UNIQUE on user_id + claim_id enforces one-vote-locked)
-- ════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS guesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  user_answer verdict NOT NULL,
  is_correct BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Backfill user_id as NOT NULL on legacy installs (after users table exists).
DO $$ BEGIN
  BEGIN
    ALTER TABLE guesses ALTER COLUMN user_id SET NOT NULL;
  EXCEPTION WHEN others THEN NULL;
  END;
END $$;

-- Add UNIQUE constraint idempotently.
DO $$ BEGIN
  ALTER TABLE guesses ADD CONSTRAINT guesses_user_claim_unique UNIQUE (user_id, claim_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_guesses_user_created ON guesses(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_guesses_claim ON guesses(claim_id);

-- ════════════════════════════════════════════════════════════════════════
-- comments  (self-ref parent_comment_id for nesting)
-- ════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS comments (
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

CREATE INDEX IF NOT EXISTS idx_comments_claim_created ON comments(claim_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_parent
  ON comments(parent_comment_id) WHERE parent_comment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id);

-- ════════════════════════════════════════════════════════════════════════
-- comment_votes
-- ════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS comment_votes (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  vote SMALLINT NOT NULL CHECK (vote IN (-1, 1)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, comment_id)
);

CREATE INDEX IF NOT EXISTS idx_comment_votes_comment ON comment_votes(comment_id);

-- ════════════════════════════════════════════════════════════════════════
-- user_submissions  (Submit-a-claim tab)
-- ════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS user_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL CHECK (char_length(text) > 0 AND char_length(text) <= 1000),
  ai_verdict ai_verdict,
  ai_confidence SMALLINT CHECK (ai_confidence BETWEEN 0 AND 100),
  ai_explanation TEXT,
  ai_sources JSONB,
  ai_category TEXT,
  is_toxic BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_submissions_user ON user_submissions(user_id, created_at DESC);

-- ════════════════════════════════════════════════════════════════════════
-- scam_forecasts + scam_forecast_items
-- ════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS scam_forecasts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  forecast_date DATE NOT NULL UNIQUE,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  generation_status forecast_status NOT NULL DEFAULT 'success'
);

CREATE TABLE IF NOT EXISTS scam_forecast_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  forecast_id UUID NOT NULL REFERENCES scam_forecasts(id) ON DELETE CASCADE,
  severity severity NOT NULL,
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

CREATE INDEX IF NOT EXISTS idx_forecast_items_forecast
  ON scam_forecast_items(forecast_id, severity);

-- ────────────────────────────────────────────────────────────────────────
-- forecast_votes
-- ────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS forecast_votes (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  forecast_item_id UUID NOT NULL REFERENCES scam_forecast_items(id) ON DELETE CASCADE,
  vote forecast_vote NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, forecast_item_id)
);

-- ════════════════════════════════════════════════════════════════════════
-- badges + user_badges
-- ════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS badges (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  rarity rarity NOT NULL DEFAULT 'common'
);

CREATE TABLE IF NOT EXISTS user_badges (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_slug TEXT NOT NULL REFERENCES badges(slug) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, badge_slug)
);

-- Seed the 8 badge definitions (idempotent via ON CONFLICT).
INSERT INTO badges (slug, name, description, icon, rarity) VALUES
  ('first-guess', 'First Guess', 'Cast your first vote', '🎯', 'common'),
  ('truth-teller', 'Truth Teller', '5 correct guesses in a row', '✅', 'rare'),
  ('on-a-roll', 'On a Roll', 'Voted 3 days in a row', '🔥', 'common'),
  ('weekly-warrior', 'Weekly Warrior', 'Voted 7 days in a row', '⚡', 'rare'),
  ('scam-hunter', 'Scam Hunter', 'Upvoted a scam forecast that proved accurate', '🕵️', 'epic'),
  ('discussion-starter', 'Discussion Starter', 'Posted a comment with 3+ upvotes', '💬', 'common'),
  ('fact-checker', 'Fact-Checker', 'Submitted 5 claims, all AI-verified', '🔍', 'rare'),
  ('top-10', 'Top 10', 'Ranked in top 10 of the daily leaderboard', '🏆', 'epic')
ON CONFLICT (slug) DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════
-- notifications
-- ════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link TEXT,
  metadata JSONB,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications(user_id, created_at DESC) WHERE is_read = false;

-- ════════════════════════════════════════════════════════════════════════
-- weekly_reports
-- ════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS weekly_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_starting DATE NOT NULL,
  total_guesses INTEGER NOT NULL DEFAULT 0,
  correct_guesses INTEGER NOT NULL DEFAULT 0,
  blind_spot_category TEXT,
  blind_spot_narrative TEXT,
  replay_claim_id UUID REFERENCES claims(id) ON DELETE SET NULL,
  global_average_accuracy REAL,
  user_accuracy REAL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, week_starting)
);

CREATE INDEX IF NOT EXISTS idx_weekly_reports_user
  ON weekly_reports(user_id, week_starting DESC);

-- Per-period AI coach notes. Stored as JSONB so we can extend with new
-- fields (e.g. a /forecast note, a profile-level note) without further
-- migrations. Shape mirrors `WeeklyReportCoachNotes` in
-- `app/src/actions/reports.ts`:
--   { trend?: string, blindSpot?: string, replay?: string, prescription?: string }
-- Idempotent — safe on re-run against an existing DB.
ALTER TABLE weekly_reports
  ADD COLUMN IF NOT EXISTS coach_notes JSONB;

-- ════════════════════════════════════════════════════════════════════════
-- discussions  (standalone forum posts, separate from claim comments)
-- ════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS discussions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(300) NOT NULL CHECK (char_length(title) > 0 AND char_length(title) <= 300),
  body TEXT NOT NULL CHECK (char_length(body) > 0 AND char_length(body) <= 500000),
  image_url TEXT,
  upvotes INTEGER NOT NULL DEFAULT 0,
  downvotes INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_discussions_user ON discussions(user_id);
CREATE INDEX IF NOT EXISTS idx_discussions_created ON discussions(created_at DESC);

-- ────────────────────────────────────────────────────────────────────────
-- discussion_votes
-- ────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS discussion_votes (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  discussion_id UUID NOT NULL REFERENCES discussions(id) ON DELETE CASCADE,
  vote SMALLINT NOT NULL CHECK (vote IN (-1, 1)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, discussion_id)
);

CREATE INDEX IF NOT EXISTS idx_discussion_votes_discussion ON discussion_votes(discussion_id);

-- ════════════════════════════════════════════════════════════════════════
-- discussion_comments  (standalone nested comments on discussions)
-- ════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS discussion_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  discussion_id UUID NOT NULL REFERENCES discussions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES discussion_comments(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) > 0 AND char_length(body) <= 500000),
  toxicity_score REAL,
  is_flagged BOOLEAN NOT NULL DEFAULT false,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  upvotes INTEGER NOT NULL DEFAULT 0,
  downvotes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_discussion_comments_discussion_created
  ON discussion_comments(discussion_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_discussion_comments_parent
  ON discussion_comments(parent_comment_id) WHERE parent_comment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_discussion_comments_user ON discussion_comments(user_id);

-- ────────────────────────────────────────────────────────────────────────
-- discussion_comment_votes
-- ────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS discussion_comment_votes (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  comment_id UUID NOT NULL REFERENCES discussion_comments(id) ON DELETE CASCADE,
  vote SMALLINT NOT NULL CHECK (vote IN (-1, 1)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, comment_id)
);

CREATE INDEX IF NOT EXISTS idx_discussion_comment_votes_comment ON discussion_comment_votes(comment_id);

-- ════════════════════════════════════════════════════════════════════════
-- Triggers  (points + first-guess badge on correct guess)
-- ════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION increment_points_on_correct_guess()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_correct THEN
    UPDATE users
       SET points = points + 10, updated_at = NOW()
     WHERE id = NEW.user_id;
    INSERT INTO user_badges (user_id, badge_slug)
      VALUES (NEW.user_id, 'first-guess')
      ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_increment_points ON guesses;
CREATE TRIGGER trg_increment_points
  AFTER INSERT ON guesses
  FOR EACH ROW EXECUTE FUNCTION increment_points_on_correct_guess();

-- ════════════════════════════════════════════════════════════════════════
-- Demo seed  (5 starter claims — extended seed will live in seed.sql)
-- ════════════════════════════════════════════════════════════════════════

INSERT INTO claims (text, verdict, category, explanation, source_url, published_at) VALUES
  (
    'A study found that 78% of Nepali journalists have encountered misinformation during their reporting.',
    'real',
    'survey_stat',
    'This statistic comes from a 2023 UNESCO MIL survey conducted in Nepal, which found significant exposure to misinformation among media professionals.',
    'https://www.unesco.org/en/mil/surveys',
    NOW() - INTERVAL '1 day'
  ),
  (
    'The Indian Space Research Organisation (ISRO) successfully landed a rover on the Moon in 2019.',
    'fake',
    'outdated_info',
    'While ISRO did launch Chandrayaan-3 in 2023 and achieved a successful landing near the lunar south pole, the 2019 Chandrayaan-2 mission failed during its landing attempt.',
    'https://www.isro.gov.in',
    NOW() - INTERVAL '2 days'
  ),
  (
    'According to the World Health Organization, vaccine hesitancy was named one of the top 10 global health threats in 2019.',
    'real',
    'misattributed_threat',
    'WHO did list vaccine hesitancy as one of the top 10 threats to global health in their 2019 report, alongside air pollution and Ebola.',
    'https://www.who.int/news-room/spotlight/ten-threats-to-global-health-in-2019',
    NOW() - INTERVAL '3 days'
  ),
  (
    'Facebook rebranded to Meta in October 2021.',
    'real',
    'factual_statement',
    'Mark Zuckerberg announced the rebranding from Facebook to Meta at the Connect 2021 conference on October 28, 2021.',
    'https://about.meta.com/',
    NOW() - INTERVAL '4 days'
  ),
  (
    'The Great Barrier Reef has never experienced mass bleaching events.',
    'fake',
    'misleading_omission',
    'The Great Barrier Reef has experienced five mass bleaching events since 2016, including severe back-to-back bleaching in 2016 and 2017, and again in 2020, 2022, and 2024.',
    'https://www.gbrmpa.gov.au/',
    NOW() - INTERVAL '5 days'
  )
ON CONFLICT DO NOTHING;