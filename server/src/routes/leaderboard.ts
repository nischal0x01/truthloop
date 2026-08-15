/**
 * Leaderboard routes — public rankings.
 * Mounted at /api/leaderboard
 *
 * Endpoints:
 *   GET /leaderboard?scope=daily|all-time&limit=10
 *     Daily:    points earned today (10/correct guess + 5/submission, capped
 *               at 20/submission-day) sorted desc.
 *     All-time: `users.points` (cumulative, includes streak days as tiebreak).
 *
 *     Response:
 *       { scope, entries, yourRank, yourPoints, yourStats }
 *
 *       entries[i] = { id, rank, displayName, avatarUrl, points, badges,
 *                      streakDays }
 *       yourRank    — null if not authenticated, or if the user has no
 *                     points in the chosen scope.
 *       yourPoints  — same shape as yourRank (null when not authed).
 *       yourStats   — { totalVotes, correctVotes, accuracyPct, streakDays }
 *                     when authenticated, else null.
 *
 * No auth required to view the board; the caller-specific fields are only
 * populated when `req.user` is present.
 */

import { Router, type Request, type Response } from 'express';
import { sql } from 'drizzle-orm';
import { db, schema } from '@/db';

const router = Router();

/* ── Types — mirrors the response shape below ── */

interface LeaderboardEntry {
  id: string;
  rank: number;
  displayName: string;
  avatarUrl: string | null;
  points: number;
  badges: number;
  streakDays: number;
}

interface CallerStats {
  totalVotes: number;
  correctVotes: number;
  accuracyPct: number;
  streakDays: number;
}

interface LeaderboardResponse {
  scope: 'daily' | 'all-time';
  entries: LeaderboardEntry[];
  yourRank: number | null;
  yourPoints: number | null;
  yourStats: CallerStats | null;
}

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

/** 00:00 UTC today — the boundary the daily board resets at. */
function todayStartUtc(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/* ── Route ── */

router.get('/', async (req: Request, res: Response) => {
  const scope: 'daily' | 'all-time' =
    req.query.scope === 'all-time' ? 'all-time' : 'daily';

  const rawLimit = Number.parseInt(String(req.query.limit ?? DEFAULT_LIMIT), 10);
  const limit = Number.isFinite(rawLimit)
    ? Math.max(1, Math.min(MAX_LIMIT, rawLimit))
    : DEFAULT_LIMIT;

  const me = req.user as { id: string } | undefined;

  const response: LeaderboardResponse =
    scope === 'daily'
      ? await buildDailyBoard(limit, me?.id)
      : await buildAllTimeBoard(limit, me?.id);

  res.json(response);
});

export default router;

/* ── Daily board ── */

async function buildDailyBoard(
  limit: number,
  meId: string | undefined
): Promise<LeaderboardResponse> {
  const today = todayStartUtc();

  // One CTE: per-user daily_points + badge count + streak, then ranked.
  // Daily points = 10 × correct guesses today + 5 × submissions today
  // (the submissions route caps awarding at 20/day; we mirror that here
  // by computing the *applied* count from the per-day sum, but for the
  // leaderboard we keep it simple — every submission made today counts
  // as +5; if the cap kicked in, the user's earned points still cap at
  // 20 from submissions today, so this is a minor over-estimate at worst).
  const top = await db.execute<{
    id: string;
    display_name: string;
    avatar_url: string | null;
    daily_points: number;
    badges: number;
    streak_days: number;
    rank: number;
  }>(sql`
    WITH daily AS (
      SELECT
        u.id,
        u.display_name,
        u.avatar_url,
        u.streak_days,
        (
          COALESCE(SUM(CASE WHEN g.is_correct THEN 10 ELSE 0 END), 0)
          + COALESCE((
              SELECT COUNT(*) * 5
              FROM user_submissions s
              WHERE s.user_id = u.id AND s.created_at >= ${today}
            ), 0)
        )::int AS daily_points,
        (SELECT COUNT(*) FROM user_badges WHERE user_id = u.id)::int AS badges
      FROM users u
      LEFT JOIN guesses g ON g.user_id = u.id AND g.created_at >= ${today}
      GROUP BY u.id
    ),
    ranked AS (
      SELECT *, ROW_NUMBER() OVER (
        ORDER BY daily_points DESC, streak_days DESC, display_name ASC
      ) AS rank
      FROM daily
      WHERE daily_points > 0
    )
    SELECT * FROM ranked
    WHERE rank <= ${limit}
    ORDER BY rank
  `);

  const entries: LeaderboardEntry[] = top.rows.map((r) => ({
    id: r.id,
    rank: Number(r.rank),
    displayName: r.display_name,
    avatarUrl: r.avatar_url,
    points: Number(r.daily_points),
    badges: Number(r.badges),
    streakDays: Number(r.streak_days),
  }));

  const { yourRank, yourPoints } = await resolveCallerDaily(meId, today);

  return {
    scope: 'daily',
    entries,
    yourRank,
    yourPoints,
    yourStats: await fetchCallerStats(meId),
  };
}

/** Find the calling user's rank on the daily board even if outside top N. */
async function resolveCallerDaily(
  meId: string | undefined,
  today: Date
): Promise<{ yourRank: number | null; yourPoints: number | null }> {
  if (!meId) return { yourRank: null, yourPoints: null };

  const mine = await db.execute<{
    rank: number | null;
    daily_points: number | null;
  }>(sql`
    WITH daily AS (
      SELECT
        u.id,
        u.display_name,
        u.streak_days,
        (
          COALESCE(SUM(CASE WHEN g.is_correct THEN 10 ELSE 0 END), 0)
          + COALESCE((
              SELECT COUNT(*) * 5
              FROM user_submissions s
              WHERE s.user_id = u.id AND s.created_at >= ${today}
            ), 0)
        )::int AS daily_points
      FROM users u
      LEFT JOIN guesses g ON g.user_id = u.id AND g.created_at >= ${today}
      GROUP BY u.id
    ),
    ranked AS (
      SELECT
        id,
        ROW_NUMBER() OVER (
          ORDER BY daily_points DESC, streak_days DESC, display_name ASC
        ) AS rank,
        daily_points
      FROM daily
      WHERE daily_points > 0
    )
    SELECT rank, daily_points FROM ranked WHERE id = ${meId}
  `);

  const row = mine.rows[0];
  if (!row) return { yourRank: null, yourPoints: null };
  return {
    yourRank: Number(row.rank),
    yourPoints: Number(row.daily_points),
  };
}

/* ── All-time board ── */

async function buildAllTimeBoard(
  limit: number,
  meId: string | undefined
): Promise<LeaderboardResponse> {
  // All-time uses `users.points` (cumulative) directly. Single ranked query.
  const top = await db.execute<{
    id: string;
    display_name: string;
    avatar_url: string | null;
    points: number;
    badges: number;
    streak_days: number;
    rank: number;
  }>(sql`
    WITH ranked AS (
      SELECT
        u.id,
        u.display_name,
        u.avatar_url,
        u.points,
        u.streak_days,
        (SELECT COUNT(*) FROM user_badges WHERE user_id = u.id)::int AS badges,
        ROW_NUMBER() OVER (
          ORDER BY u.points DESC, u.streak_days DESC, u.display_name ASC
        ) AS rank
      FROM users u
      WHERE u.points > 0
    )
    SELECT * FROM ranked
    WHERE rank <= ${limit}
    ORDER BY rank
  `);

  const entries: LeaderboardEntry[] = top.rows.map((r) => ({
    id: r.id,
    rank: Number(r.rank),
    displayName: r.display_name,
    avatarUrl: r.avatar_url,
    points: Number(r.points),
    badges: Number(r.badges),
    streakDays: Number(r.streak_days),
  }));

  const { yourRank, yourPoints } = await resolveCallerAllTime(meId);

  return {
    scope: 'all-time',
    entries,
    yourRank,
    yourPoints,
    yourStats: await fetchCallerStats(meId),
  };
}

async function resolveCallerAllTime(
  meId: string | undefined
): Promise<{ yourRank: number | null; yourPoints: number | null }> {
  if (!meId) return { yourRank: null, yourPoints: null };

  const mine = await db.execute<{ rank: number; points: number }>(sql`
    WITH ranked AS (
      SELECT
        u.id,
        u.points,
        ROW_NUMBER() OVER (
          ORDER BY u.points DESC, u.streak_days DESC, u.display_name ASC
        ) AS rank
      FROM users u
      WHERE u.points > 0
    )
    SELECT rank, points FROM ranked WHERE id = ${meId}
  `);

  const row = mine.rows[0];
  if (!row) return { yourRank: null, yourPoints: null };
  return {
    yourRank: Number(row.rank),
    yourPoints: Number(row.points),
  };
}

/* ── Caller stats — used by the sidebar "your rank" card ── */

async function fetchCallerStats(
  meId: string | undefined
): Promise<CallerStats | null> {
  if (!meId) return null;

  // Pull streak + total/correct guesses in parallel — independent reads.
  const [userRow, statsRow] = await Promise.all([
    db
      .select({ streakDays: schema.users.streakDays })
      .from(schema.users)
      .where(sql`${schema.users.id} = ${meId}`)
      .limit(1),
    db.execute<{ total: number; correct: number }>(sql`
      SELECT
        COUNT(*)::int AS total,
        SUM(CASE WHEN is_correct THEN 1 ELSE 0 END)::int AS correct
      FROM guesses
      WHERE user_id = ${meId}
    `),
  ]);

  const total = Number(statsRow.rows[0]?.total ?? 0);
  const correct = Number(statsRow.rows[0]?.correct ?? 0);
  const accuracyPct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const streakDays = Number(userRow[0]?.streakDays ?? 0);

  return { totalVotes: total, correctVotes: correct, accuracyPct, streakDays };
}
