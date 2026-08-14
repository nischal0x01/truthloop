/**
 * Leaderboard routes — daily + all-time rankings + user rank + activity feed.
 * Mounted at /api/leaderboard
 */
import { Router, type Request, type Response, type NextFunction } from 'express';
import { eq, sql, desc, and, gte } from 'drizzle-orm';
import { db, schema } from '@/db';
import { AppError } from '@/middleware/errorHandler';

const router = Router();

/** Reject unauthenticated requests. */
function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    throw new AppError(401, 'You must be signed in.');
  }
  next();
}

// ──────────────────────────────────────────────────────────────────────────
// GET /leaderboard/daily
// Points earned today (UTC), top 50, ranked by points DESC then guesses ASC.
// ──────────────────────────────────────────────────────────────────────────
router.get('/daily', requireAuth, async (req, res) => {
  const todayStart = sql`date_trunc('day', NOW() AT TIME ZONE 'UTC')`;
  const tomorrowStart = sql`date_trunc('day', NOW() AT TIME ZONE 'UTC') + INTERVAL '1 day'`;
  const userId = (req.user as { id: string }).id;

  const rows = await db.execute<{
    id: string;
    display_name: string;
    avatar_url: string | null;
    points_today: number;
    guesses_today: number;
  }>(sql`
    SELECT
      u.id::text,
      u.display_name::text,
      u.avatar_url::text,
      COALESCE(SUM(CASE WHEN g.is_correct THEN 10 ELSE 0 END), 0)::int AS points_today,
      COUNT(g.id)::int AS guesses_today
    FROM users u
    LEFT JOIN guesses g ON g.user_id = u.id
      AND g.created_at >= ${todayStart}
      AND g.created_at < ${tomorrowStart}
    WHERE u.is_admin = false
    GROUP BY u.id
    HAVING COUNT(g.id) > 0
    ORDER BY points_today DESC, guesses_today ASC
    LIMIT 50
  `);

  // Also compute the current user's rank (may be outside top 50)
  const userRow = rows.rows.find((r) => r.id === userId);
  const userRank = userRow
    ? rows.rows.filter((r) => r.points_today > userRow.points_today).length + 1
    : null;

  const entries = rows.rows.map((r, i) => ({
    rank: i + 1,
    name: r.display_name,
    avatar: r.avatar_url,
    points: r.points_today,
    isCurrentUser: r.id === userId,
  }));

  res.json({ entries, userRank, scope: 'daily' });
});

// ──────────────────────────────────────────────────────────────────────────
// GET /leaderboard/all-time
// Lifetime points, top 50, ranked by points DESC then earliest account ASC.
// ──────────────────────────────────────────────────────────────────────────
router.get('/all-time', requireAuth, async (req, res) => {
  const userId = (req.user as { id: string }).id;

  const rows = await db.execute<{
    id: string;
    display_name: string;
    avatar_url: string | null;
    points: number;
    streak_days: number;
  }>(sql`
    SELECT
      u.id::text,
      u.display_name::text,
      u.avatar_url::text,
      u.points::int,
      u.streak_days::int
    FROM users u
    WHERE u.is_admin = false
    ORDER BY u.points DESC, u.created_at ASC
    LIMIT 50
  `);

  // User's all-time rank (may be outside top 50)
  const userPoints = rows.rows.find((r) => r.id === userId)?.points ?? null;
  const userRank = userPoints !== null
    ? rows.rows.filter((r) => r.points > userPoints).length + 1
    : null;

  const entries = rows.rows.map((r, i) => ({
    rank: i + 1,
    name: r.display_name,
    avatar: r.avatar_url,
    points: r.points,
    streak: r.streak_days,
    isCurrentUser: r.id === userId,
  }));

  res.json({ entries, userRank, scope: 'all-time' });
});

// ──────────────────────────────────────────────────────────────────────────
// GET /leaderboard/me
// Current user's rank in both scopes + accuracy stats.
// ──────────────────────────────────────────────────────────────────────────
router.get('/me', requireAuth, async (req, res) => {
  const userId = (req.user as { id: string }).id;
  const todayStart = sql`date_trunc('day', NOW() AT TIME ZONE 'UTC')`;
  const tomorrowStart = sql`date_trunc('day', NOW() AT TIME ZONE 'UTC') + INTERVAL '1 day'`;

  // Daily points for today
  const dailyResult = await db.execute<{ pts: number }>(sql`
    SELECT COALESCE(SUM(CASE WHEN is_correct THEN 10 ELSE 0 END), 0)::int AS pts
    FROM guesses
    WHERE user_id = ${userId}
      AND created_at >= ${todayStart}
      AND created_at < ${tomorrowStart}
  `);
  const dailyPts = dailyResult.rows[0]?.pts ?? 0;

  // All-time rank
  const allTimeRankResult = await db.execute<{ rank: number }>(sql`
    SELECT COUNT(*) + 1 AS rank
    FROM users
    WHERE points > (SELECT points FROM users WHERE id = ${userId})
      AND is_admin = false
  `);
  const allTimeRank = allTimeRankResult.rows[0]?.rank ?? 1;

  // Daily rank
  const dailyRankResult = await db.execute<{ rank: number }>(sql`
    SELECT COUNT(*) + 1 AS rank
    FROM (
      SELECT user_id, SUM(CASE WHEN is_correct THEN 10 ELSE 0 END) AS pts
      FROM guesses
      WHERE created_at >= ${todayStart}
        AND created_at < ${tomorrowStart}
      GROUP BY user_id
    ) ranked
    WHERE pts > ${dailyPts}
  `);
  const dailyRank = dailyRankResult.rows[0]?.rank ?? 1;

  // Accuracy
  const accuracyResult = await db.execute<{ total: number; correct: number }>(sql`
    SELECT
      COUNT(*)::int AS total,
      SUM(CASE WHEN is_correct THEN 1 ELSE 0 END)::int AS correct
    FROM guesses
    WHERE user_id = ${userId}
  `);
  const total = accuracyResult.rows[0]?.total ?? 0;
  const correct = accuracyResult.rows[0]?.correct ?? 0;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) / 100 : 0;

  res.json({
    dailyRank: dailyPts > 0 ? dailyRank : null,
    allTimeRank,
    totalGuesses: total,
    accuracy,
  });
});

// ──────────────────────────────────────────────────────────────────────────
// GET /leaderboard/milestones
// Real next-rank target + next unearned badge for the current user.
// ──────────────────────────────────────────────────────────────────────────
router.get('/milestones', requireAuth, async (req, res) => {
  const userId = (req.user as { id: string }).id;
  const todayStart = sql`date_trunc('day', NOW() AT TIME ZONE 'UTC')`;
  const tomorrowStart = sql`date_trunc('day', NOW() AT TIME ZONE 'UTC') + INTERVAL '1 day'`;

  // User's daily points today
  const dailyResult = await db.execute<{ pts: number }>(sql`
    SELECT COALESCE(SUM(CASE WHEN is_correct THEN 10 ELSE 0 END), 0)::int AS pts
    FROM guesses
    WHERE user_id = ${userId}
      AND created_at >= ${todayStart}
      AND created_at < ${tomorrowStart}
  `);
  const dailyPts = dailyResult.rows[0]?.pts ?? 0;

  // Rank thresholds: build a mini leaderboard just for the ranks we care about.
  // Ranks to check: 10, 5, 1 (the milestone targets).
  // We compute the points needed to reach each by finding the points of the
  // user currently at that rank, then computing the gap.
  const rankTargetsResult = await db.execute<{ rank: number; pts: number }>(sql`
    WITH ranked AS (
      SELECT
        u.id,
        RANK() OVER (ORDER BY COALESCE(SUM(CASE WHEN g.is_correct THEN 10 ELSE 0 END), 0) DESC, COUNT(g.id) ASC) AS rnk,
        COALESCE(SUM(CASE WHEN g.is_correct THEN 10 ELSE 0 END), 0)::int AS pts
      FROM users u
      LEFT JOIN guesses g ON g.user_id = u.id
        AND g.created_at >= ${todayStart}
        AND g.created_at < ${tomorrowStart}
      WHERE u.is_admin = false
      GROUP BY u.id
    )
    SELECT rnk AS rank, pts
    FROM ranked
    WHERE rnk IN (1, 5, 10)
    ORDER BY rnk ASC
  `);

  const thresholds = rankTargetsResult.rows; // [{rank, pts}, ...]

  // Find the next rank milestone above the user
  const userRankResult = await db.execute<{ rank: number }>(sql`
    SELECT COUNT(*) + 1 AS rank
    FROM (
      SELECT user_id, SUM(CASE WHEN is_correct THEN 10 ELSE 0 END) AS pts
      FROM guesses
      WHERE created_at >= ${todayStart}
        AND created_at < ${tomorrowStart}
      GROUP BY user_id
    ) ranked
    WHERE pts > ${dailyPts}
  `);
  const userRank = userRankResult.rows[0]?.rank ?? 1;

  // Compute next rank target:
  // If user is already #1 → no next rank milestone
  // Otherwise find the next rank threshold above them
  let nextRankMilestone: { targetRank: number; pointsNeeded: number; currentPoints: number } | null = null;
  if (userRank > 1) {
    // Find the rank just above the user
    const aboveRankResult = await db.execute<{ rnk: number; pts: number }>(sql`
      WITH ranked AS (
        SELECT
          u.id,
          RANK() OVER (ORDER BY COALESCE(SUM(CASE WHEN g.is_correct THEN 10 ELSE 0 END), 0) DESC, COUNT(g.id) ASC) AS rnk,
          COALESCE(SUM(CASE WHEN g.is_correct THEN 10 ELSE 0 END), 0)::int AS pts
        FROM users u
        LEFT JOIN guesses g ON g.user_id = u.id
          AND g.created_at >= ${todayStart}
          AND g.created_at < ${tomorrowStart}
        WHERE u.is_admin = false
        GROUP BY u.id
      )
      SELECT rnk, pts FROM ranked
      WHERE rnk < ${userRank}
      ORDER BY rnk DESC
      LIMIT 1
    `);
    const above = aboveRankResult.rows[0];
    if (above) {
      nextRankMilestone = {
        targetRank: Number(above.rnk),
        pointsNeeded: Math.max(0, Number(above.pts) - dailyPts + 1),
        currentPoints: dailyPts,
      };
    }
  }

  // Next unearned badge
  const earnedResult = await db.execute<{ slug: string }>(sql`
    SELECT badge_slug::text FROM user_badges WHERE user_id = ${userId}
  `);
  const earnedSlugs = new Set(earnedResult.rows.map((r) => r.slug));

  const nextBadgeResult = await db.execute<{
    slug: string;
    name: string;
    icon: string;
    rarity: string;
  }>(sql`
    SELECT slug::text, name::text, icon::text, rarity::text
    FROM badges
    WHERE slug != 'top-10'  -- top-10 is awarded automatically, skip it
    ORDER BY
      CASE rarity
        WHEN 'legendary' THEN 1
        WHEN 'epic' THEN 2
        WHEN 'rare' THEN 3
        WHEN 'common' THEN 4
      END ASC
    LIMIT 1
  `);

  // Also compute how many points until that badge (badges are event-based, not point-based,
  // so we show 0 pts away and let the trigger handle it — the user just needs to keep voting)
  const nextBadge = nextBadgeResult.rows[0] ?? null;

  // Compute a meaningful progress proxy per badge type.
  // Streak-based badges: progress = min(streak / threshold, 1.0)
  // Binary badges (e.g. founding-100, top-10): pointsNeeded = -1 → no progress bar
  const streakResult = await db.execute<{ streak: number }>(sql`
    SELECT streak_days::int AS streak FROM users WHERE id = ${userId}
  `);
  const streak = streakResult.rows[0]?.streak ?? 0;

  let badgeProgress = 0.3; // default: started, not yet earned
  let badgePointsNeeded = 0;

  // Binary badges — no incremental progress path, no progress bar
  if (nextBadge?.slug === 'founding-100' || nextBadge?.slug === 'top-10') {
    badgeProgress = 0;
    badgePointsNeeded = -1; // signal to frontend: skip the progress bar
  } else if (nextBadge?.slug === 'on-a-roll') {
    badgeProgress = Math.min(streak / 3, 1);
  } else if (nextBadge?.slug === 'weekly-warrior') {
    badgeProgress = Math.min(streak / 7, 1);
  } else if (nextBadge?.slug === 'first-guess') {
    badgeProgress = 0.8;
  }

  const nextBadgeData = nextBadge && !earnedSlugs.has(nextBadge.slug)
    ? {
        slug: nextBadge.slug,
        name: nextBadge.name,
        icon: nextBadge.icon,
        rarity: nextBadge.rarity,
        pointsNeeded: badgePointsNeeded,
        progress: badgeProgress,
      }
    : null;

  res.json({
    nextRank: nextRankMilestone,
    nextBadge: nextBadgeData,
    userDailyPoints: dailyPts,
    userRank,
  });
});

// ──────────────────────────────────────────────────────────────────────────
// GET /leaderboard/activity
// Recent global votes and badge awards, mixed and sorted by time DESC.
// ──────────────────────────────────────────────────────────────────────────
router.get('/activity', requireAuth, async (req, res) => {
  const rows = await db.execute<{
    id: string;
    user_name: string;
    target: string;
    is_correct: boolean | null;
    type: 'vote' | 'badge';
    created_at: Date;
  }>(sql`
    (
      SELECT
        g.id::text,
        u.display_name::text AS user_name,
        SUBSTRING(c.text FOR 60) AS target,
        g.is_correct,
        'vote'::text AS type,
        g.created_at
      FROM guesses g
      JOIN users u ON u.id = g.user_id
      JOIN claims c ON c.id = g.claim_id
      ORDER BY g.created_at DESC
      LIMIT 4
    )
    UNION ALL
    (
      SELECT
        ub.badge_slug::text || '-' || ub.user_id::text AS id,
        u.display_name::text AS user_name,
        b.name AS target,
        NULL::boolean AS is_correct,
        'badge'::text AS type,
        ub.earned_at AS created_at
      FROM user_badges ub
      JOIN users u ON u.id = ub.user_id
      JOIN badges b ON b.slug = ub.badge_slug
      ORDER BY ub.earned_at DESC
      LIMIT 1
    )
    ORDER BY created_at DESC
    LIMIT 5
  `);

  const entries = rows.rows.map((r) => ({
    id: r.id,
    user: r.user_name,
    action: r.type === 'vote' ? 'voted on' : 'earned badge',
    target: r.target,
    correct: r.is_correct,
    time: formatTimeAgo(r.created_at),
  }));

  res.json({ entries });
});

// ──────────────────────────────────────────────────────────────────────────
// Helper
// ──────────────────────────────────────────────────────────────────────────

function formatTimeAgo(date: Date | string): string {
  const ms = typeof date === 'string' ? new Date(date).getTime() : date.getTime();
  const seconds = Math.floor((Date.now() - ms) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default router;
