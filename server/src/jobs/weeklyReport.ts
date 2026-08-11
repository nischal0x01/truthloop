/**
 * Weekly Report Generation — Sunday 00:00 UTC cron.
 *
 * For each user who voted ≥1 time in the past 7 days:
 * 1. Compute accuracy + blind spot from guesses
 * 2. Call Claude (opus) for the narrative
 * 3. Store in weekly_reports table
 * 4. Queue email digest (if enabled)
 */

import { db, schema } from '@/db';
import { callWeeklyNarrative } from '@/ai';
import { sql, eq, desc } from 'drizzle-orm';
import { logger } from '@/utils/logger';

const CATEGORY_LABELS: Record<string, string> = {
  factual_statement: 'straight factual claims',
  outdated_info: 'old news presented as new',
  misleading_omission: 'misleading omissions',
  manipulated_stat: 'manipulated statistics',
  misattributed_quote: 'misattributed quotes',
  satire_mistaken_as_real: 'satire mistaken as real news',
  survey_stat: 'survey statistics',
  conspiracy_theory: 'conspiracy theories',
  misattributed_threat: 'misattributed threats',
  unverified_claim: 'unverified claims',
};

function categoryHuman(slug: string): string {
  return CATEGORY_LABELS[slug] ?? slug;
}

export async function generateWeeklyReports(): Promise<void> {
  logger.info('[weeklyReport] Starting weekly report generation');

  const sevenDaysAgo = sql`NOW() - INTERVAL '7 days'`;
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  const weekStartStr = weekStart.toISOString().split('T')[0];

  // Get all users who voted in the past 7 days
  const activeUsers = await db.execute<{ user_id: string }>(sql`
    SELECT DISTINCT ${schema.guesses.userId}::text AS user_id
    FROM ${schema.guesses}
    WHERE ${schema.guesses.createdAt} >= ${sevenDaysAgo}
  `);

  logger.info(`[weeklyReport] ${activeUsers.rows.length} active users to process`);

  for (const row of activeUsers.rows) {
    const userId = row.user_id;
    try {
      await generateUserReport(userId, weekStartStr, sevenDaysAgo);
    } catch (err) {
      logger.error({ err, userId }, '[weeklyReport] Failed to generate report for user');
    }
  }

  logger.info('[weeklyReport] Weekly report generation complete');
}

async function generateUserReport(
  userId: string,
  weekStartStr: string,
  sevenDaysAgo: ReturnType<typeof sql>
): Promise<void> {
  // 1. Accuracy
  const accuracyResult = await db.execute<{ total: number; correct: number }>(sql`
    SELECT
      COUNT(*)::int AS total,
      SUM(CASE WHEN ${schema.guesses.isCorrect} THEN 1 ELSE 0 END)::int AS correct
    FROM ${schema.guesses}
    WHERE ${schema.guesses.userId} = ${userId}
      AND ${schema.guesses.createdAt} >= ${sevenDaysAgo}
  `);
  const { total, correct } = accuracyResult.rows[0] ?? { total: 0, correct: 0 };

  if (total === 0) return; // nothing to report

  const userAccuracy = correct / total;

  // 2. Blind spot — most-missed category
  const blindSpotResult = await db.execute<{ category: string; wrongCount: number }>(sql`
    SELECT
      ${schema.claims.category}::text AS category,
      COUNT(*)::int AS wrong_count
    FROM ${schema.guesses}
    JOIN ${schema.claims} ON ${schema.claims.id} = ${schema.guesses.claimId}
    WHERE ${schema.guesses.userId} = ${userId}
      AND ${schema.guesses.isCorrect} = false
      AND ${schema.guesses.createdAt} >= ${sevenDaysAgo}
    GROUP BY ${schema.claims.category}
    ORDER BY COUNT(*) DESC
    LIMIT 1
  `);
  const blindSpot = blindSpotResult.rows[0];

  // 3. Category breakdown for wrong guesses
  const breakdownResult = await db.execute<{ category: string; wrongCount: number }>(sql`
    SELECT
      ${schema.claims.category}::text AS category,
      COUNT(*)::int AS wrong_count
    FROM ${schema.guesses}
    JOIN ${schema.claims} ON ${schema.claims.id} = ${schema.guesses.claimId}
    WHERE ${schema.guesses.userId} = ${userId}
      AND ${schema.guesses.isCorrect} = false
      AND ${schema.guesses.createdAt} >= ${sevenDaysAgo}
    GROUP BY ${schema.claims.category}
  `);
  const categoryBreakdown: Record<string, number> = {};
  for (const row of breakdownResult.rows) {
    categoryBreakdown[row.category] = row.wrongCount;
  }

  // 4. Top correct categories
  const correctCategoriesResult = await db.execute<{ category: string }>(sql`
    SELECT ${schema.claims.category}::text AS category
    FROM ${schema.guesses}
    JOIN ${schema.claims} ON ${schema.claims.id} = ${schema.guesses.claimId}
    WHERE ${schema.guesses.userId} = ${userId}
      AND ${schema.guesses.isCorrect} = true
      AND ${schema.guesses.createdAt} >= ${sevenDaysAgo}
    GROUP BY ${schema.claims.category}
    ORDER BY COUNT(*) DESC
    LIMIT 3
  `);
  const topCorrectCategories = correctCategoriesResult.rows.map((r) => r.category);

  // 5. Top missed claim (most recent wrong guess)
  const replayResult = await db.execute<{
    id: string; text: string; category: string; user_answer: string; verdict: string;
  }>(sql`
    SELECT
      ${schema.claims.id}::text AS id,
      ${schema.claims.text}::text AS text,
      ${schema.claims.category}::text AS category,
      ${schema.guesses.userAnswer}::text AS user_answer,
      ${schema.claims.verdict}::text AS verdict
    FROM ${schema.guesses}
    JOIN ${schema.claims} ON ${schema.claims.id} = ${schema.guesses.claimId}
    WHERE ${schema.guesses.userId} = ${userId}
      AND ${schema.guesses.isCorrect} = false
      AND ${schema.guesses.createdAt} >= ${sevenDaysAgo}
    ORDER BY ${schema.guesses.createdAt} DESC
    LIMIT 1
  `);
  const replayRow = replayResult.rows[0];

  // 6. Global average accuracy (all users)
  const globalResult = await db.execute<{ global_accuracy: number }>(sql`
    SELECT
      COALESCE(
        SUM(CASE WHEN ${schema.guesses.isCorrect} THEN 1 ELSE 0 END)::float /
        NULLIF(COUNT(*), 0),
        0
      ) AS global_accuracy
    FROM ${schema.guesses}
    WHERE ${schema.guesses.createdAt} >= ${sevenDaysAgo}
  `);
  const globalAverageAccuracy = Number(globalResult.rows[0]?.global_accuracy ?? 0);

  // 7. Generate narrative with Claude
  let blindSpotNarrative = 'Great week — keep voting to sharpen your instincts.';

  if (blindSpot) {
    try {
      const narrativeResult = await callWeeklyNarrative({
        userAccuracy,
        userBlindSpotCategory: blindSpot.category,
        userBlindSpotCategoryHuman: categoryHuman(blindSpot.category),
        categoryBreakdown,
        globalAverageAccuracy,
        userTopMissedClaims: replayRow
          ? [{
              text: replayRow.text,
              category: replayRow.category,
              userAnswer: replayRow.user_answer,
              verdict: replayRow.verdict,
            }]
          : [],
        userTopCorrectCategories: topCorrectCategories,
      });
      blindSpotNarrative = narrativeResult.narrative;
    } catch (err) {
      logger.warn({ err, userId }, '[weeklyReport] Claude narrative generation failed, using fallback');
    }
  }

  // 8. Upsert weekly report
  await db
    .insert(schema.weeklyReports)
    .values({
      userId,
      weekStarting: weekStartStr,
      totalGuesses: total,
      correctGuesses: correct,
      userAccuracy,
      globalAverageAccuracy,
      blindSpotCategory: blindSpot?.category ?? null,
      blindSpotNarrative,
      replayClaimId: replayRow?.id ?? null,
    })
    .onConflictDoUpdate({
      target: [schema.weeklyReports.userId, schema.weeklyReports.weekStarting],
      set: {
        totalGuesses: total,
        correctGuesses: correct,
        userAccuracy,
        globalAverageAccuracy,
        blindSpotCategory: blindSpot?.category ?? null,
        blindSpotNarrative,
        replayClaimId: replayRow?.id ?? null,
        createdAt: new Date(),
      },
    });

  logger.info({ userId, total, correct }, '[weeklyReport] Report generated');
}
