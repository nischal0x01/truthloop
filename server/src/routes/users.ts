/**
 * Users routes — authenticated, current-user-only.
 * Mounted at /api/users
 *
 * Right now we serve one composite endpoint:
 *   GET /me/profile
 *     Returns everything the /profile page needs in a single round-trip:
 *       - user (full row, not the SafeUser subset)
 *       - stats: total votes, correct votes, accuracy %
 *       - badges: earned badges with their definitions (slug, name, icon, rarity, earnedAt)
 *       - allBadges: every defined badge so we can render the locked tiles too
 *       - recentActivity: last 5 guesses with claim text + verdict + correctness
 *       - latestWeeklyReport: most recent weekly_reports row for this user (if any)
 */
import { Router, type Request, type Response, type NextFunction } from 'express';
import { eq, sql, desc } from 'drizzle-orm';
import { db, schema } from '@/db';
import { AppError } from '@/middleware/errorHandler';

const router = Router();

function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    throw new AppError(401, 'You must be signed in.');
  }
  next();
}

/* ── Types — mirrors the response shape below ── */

type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

interface BadgeWithEarnedAt {
  slug: string;
  name: string;
  description: string;
  icon: string;
  rarity: Rarity;
  earnedAt: string | null;
}

interface RecentVote {
  guessId: string;
  claimId: string;
  claimText: string;
  claimCategory: string;
  claimVerdict: 'real' | 'fake';
  userAnswer: 'real' | 'fake';
  isCorrect: boolean;
  createdAt: string;
}

/* ── GET /users/me/profile ── */

router.get('/me/profile', requireAuth, async (req, res) => {
  const userId = (req.user as { id: string }).id;

  // 1. Full user row.
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);
  if (!user) throw new AppError(404, 'User not found.');

  // 2. Stats — totals + accuracy.
  const statsResult = await db.execute<{ total: number; correct: number }>(sql`
    SELECT
      COUNT(*)::int AS total,
      SUM(CASE WHEN ${schema.guesses.isCorrect} THEN 1 ELSE 0 END)::int AS correct
    FROM ${schema.guesses}
    WHERE ${schema.guesses.userId} = ${userId}
  `);
  const totalVotes = statsResult.rows[0]?.total ?? 0;
  const correctVotes = statsResult.rows[0]?.correct ?? 0;
  const accuracyPct = totalVotes > 0 ? Math.round((correctVotes / totalVotes) * 100) : 0;

  // 3. Earned badges + 4. All badge definitions — LEFT JOIN gives us earned
  //    timestamps without missing the ones the user hasn't earned yet.
  const badgeRows = await db
    .select({
      slug: schema.badges.slug,
      name: schema.badges.name,
      description: schema.badges.description,
      icon: schema.badges.icon,
      rarity: schema.badges.rarity,
      earnedAt: schema.userBadges.earnedAt,
    })
    .from(schema.badges)
    .leftJoin(
      schema.userBadges,
      sql`${schema.userBadges.badgeSlug} = ${schema.badges.slug}
          AND ${schema.userBadges.userId} = ${userId}`
    );

  const earnedCount = badgeRows.filter((b) => b.earnedAt !== null).length;

  // 5. Recent activity — last 5 guesses with claim details.
  const recentRows = await db
    .select({
      guessId: schema.guesses.id,
      claimId: schema.guesses.claimId,
      claimText: schema.claims.text,
      claimCategory: schema.claims.category,
      claimVerdict: schema.claims.verdict,
      userAnswer: schema.guesses.userAnswer,
      isCorrect: schema.guesses.isCorrect,
      createdAt: schema.guesses.createdAt,
    })
    .from(schema.guesses)
    .innerJoin(schema.claims, eq(schema.claims.id, schema.guesses.claimId))
    .where(eq(schema.guesses.userId, userId))
    .orderBy(desc(schema.guesses.createdAt))
    .limit(5);

  const recentActivity: RecentVote[] = recentRows.map((r) => ({
    guessId: r.guessId,
    claimId: r.claimId,
    claimText: r.claimText,
    claimCategory: r.claimCategory,
    claimVerdict: r.claimVerdict,
    userAnswer: r.userAnswer,
    isCorrect: r.isCorrect,
    createdAt: r.createdAt.toISOString(),
  }));

  // 6. Latest weekly report (most recent week).
  const [latestReport] = await db
    .select()
    .from(schema.weeklyReports)
    .where(eq(schema.weeklyReports.userId, userId))
    .orderBy(desc(schema.weeklyReports.weekStarting))
    .limit(1);

  const badges: BadgeWithEarnedAt[] = badgeRows.map((b) => ({
    slug: b.slug,
    name: b.name,
    description: b.description,
    icon: b.icon,
    rarity: b.rarity,
    earnedAt: b.earnedAt ? b.earnedAt.toISOString() : null,
  }));

  res.json({
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      isAdmin: user.isAdmin,
      points: user.points,
      streakDays: user.streakDays,
      createdAt: user.createdAt.toISOString(),
    },
    stats: {
      totalVotes,
      correctVotes,
      accuracyPct,
      earnedBadges: earnedCount,
      totalBadges: badgeRows.length,
    },
    badges,
    recentActivity,
    latestWeeklyReport: latestReport
      ? {
          weekStarting: latestReport.weekStarting,
          totalGuesses: latestReport.totalGuesses,
          correctGuesses: latestReport.correctGuesses,
          blindSpotCategory: latestReport.blindSpotCategory,
          blindSpotNarrative: latestReport.blindSpotNarrative,
          replayClaimId: latestReport.replayClaimId,
          globalAverageAccuracy: latestReport.globalAverageAccuracy,
          userAccuracy: latestReport.userAccuracy,
          createdAt: latestReport.createdAt.toISOString(),
        }
      : null,
  });
});

export default router;