/**
 * Claims routes — voting loop + weekly report.
 * Mounted at /api/claims
 *
 * Demonstrates three Drizzle patterns:
 *  1. Simple select + filter  → query builder
 *  2. Insert + return         → query builder with .returning()
 *  3. Aggregations / CTEs     → raw SQL escape hatch via `sql` template
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
// GET /claims
// List all published claims, newest first.
// ──────────────────────────────────────────────────────────────────────────
router.get('/', async (_req, res) => {
  const rows = await db
    .select()
    .from(schema.claims)
    .where(eq(schema.claims.isPublished, true))
    .orderBy(desc(schema.claims.publishedAt), desc(schema.claims.createdAt));

  res.json({ claims: rows });
});

// ──────────────────────────────────────────────────────────────────────────
// GET /claims/me/guesses
// MUST be registered before /:id — Express matches in registration order,
// so /me would otherwise be captured as :id and return 404.
// Returns { [claim_id]: { answer, correct } } for the signed-in user.
// ──────────────────────────────────────────────────────────────────────────
router.get('/me/guesses', requireAuth, async (req, res) => {
  const userId = (req.user as { id: string }).id;

  const rows = await db
    .select({
      claimId: schema.guesses.claimId,
      userAnswer: schema.guesses.userAnswer,
      isCorrect: schema.guesses.isCorrect,
      createdAt: schema.guesses.createdAt,
    })
    .from(schema.guesses)
    .where(eq(schema.guesses.userId, userId));

  res.json({
    guesses: rows.reduce<Record<string, { answer: 'real' | 'fake'; correct: boolean }>>(
      (acc, g) => {
        acc[g.claimId] = { answer: g.userAnswer, correct: g.isCorrect };
        return acc;
      },
      {}
    ),
  });
});

// ──────────────────────────────────────────────────────────────────────────
// GET /claims/:id
// Fetch a single claim. Verdict is hidden from clients until the user votes.
// ──────────────────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  const [claim] = await db
    .select()
    .from(schema.claims)
    .where(eq(schema.claims.id, id))
    .limit(1);

  if (!claim) {
    throw new AppError(404, 'Claim not found');
  }

  res.json({ claim });
});

// ──────────────────────────────────────────────────────────────────────────
// POST /claims/:id/guess
// Record a vote. One vote per user — UNIQUE(user_id, claim_id) enforces this.
// User identity comes from the session (req.user.id), not the request body.
// ──────────────────────────────────────────────────────────────────────────
router.post('/:id/guess', requireAuth, async (req, res) => {
  const userId = (req.user as { id: string }).id;
  const { id } = req.params;
  const { user_answer } = req.body as { user_answer?: 'real' | 'fake' };

  if (!user_answer) {
    throw new AppError(400, 'user_answer is required ("real" or "fake").');
  }
  if (!['real', 'fake'].includes(user_answer)) {
    throw new AppError(400, 'user_answer must be "real" or "fake".');
  }

  // Fetch claim to compute is_correct
  const [claim] = await db
    .select()
    .from(schema.claims)
    .where(eq(schema.claims.id, id))
    .limit(1);

  if (!claim) {
    throw new AppError(404, 'Claim not found');
  }

  const isCorrect = claim.verdict === user_answer;

  // INSERT guess — Drizzle handles parameterized binding.
  // The UNIQUE(user_id, claim_id) constraint will surface as a Postgres
  // 23505 error if the user already voted — we translate it to a 409 below.
  let guess: typeof schema.guesses.$inferSelect;
  try {
    [guess] = await db
      .insert(schema.guesses)
      .values({
        userId,
        claimId: id,
        userAnswer: user_answer,
        isCorrect,
      })
      .returning();
  } catch (err) {
    // Drizzle wraps the underlying pg error in `cause`; the SQLSTATE lives there.
    const cause = (err as { cause?: unknown })?.cause;
    const code =
      (cause && typeof cause === 'object' && 'code' in cause && (cause as { code?: unknown }).code) ||
      (err && typeof err === 'object' && 'code' in err && (err as { code?: unknown }).code);
    if (code === '23505') {
      throw new AppError(409, 'You have already voted on this claim.');
    }
    throw err;
  }

  // Increment vote_count on the claim (denormalised counter)
  await db
    .update(schema.claims)
    .set({ voteCount: sql`${schema.claims.voteCount} + 1` })
    .where(eq(schema.claims.id, id));

  // If correct, bump user points (the trigger in schema.sql handles first-guess badge)
  if (isCorrect) {
    await db
      .update(schema.users)
      .set({
        points: sql`${schema.users.points} + 10`,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, userId));
  }

  res.status(201).json({
    guess: {
      claimId: guess.claimId,
      userAnswer: guess.userAnswer,
      isCorrect: guess.isCorrect,
      createdAt: guess.createdAt,
    },
    correct: isCorrect,
    pointsAwarded: isCorrect ? 10 : 0,
    claim: {
      id: claim.id,
      text: claim.text,
      verdict: claim.verdict,
      explanation: claim.explanation,
      sourceUrl: claim.sourceUrl,
      category: claim.category,
    },
  });
});

// ──────────────────────────────────────────────────────────────────────────
// GET /users/:userId/report
// Weekly blind-spot report — uses the raw `sql` escape hatch for the
// aggregation. Drizzle handles parameterization; we get type safety on
// columns we reference inside the template.
// ──────────────────────────────────────────────────────────────────────────
router.get('/users/:userId/report', async (req, res) => {
  const { userId } = req.params;
  const sevenDaysAgo = sql`NOW() - INTERVAL '7 days'`;

  // 1. Accuracy (correct / total)
  const accuracyResult = await db.execute<{
    total: number;
    correct: number;
  }>(sql`
    SELECT
      COUNT(*)::int AS total,
      SUM(CASE WHEN ${schema.guesses.isCorrect} THEN 1 ELSE 0 END)::int AS correct
    FROM ${schema.guesses}
    WHERE ${schema.guesses.userId} = ${userId}
      AND ${schema.guesses.createdAt} >= ${sevenDaysAgo}
  `);
  const accuracyRow = accuracyResult.rows[0];

  const totalNum = accuracyRow?.total ?? 0;
  const correctNum = accuracyRow?.correct ?? 0;

  // 2. Blind spot — most-missed category in past 7 days
  const blindSpotResult = await db.execute<{ category: string }>(sql`
    SELECT ${schema.claims.category}::text AS category
    FROM ${schema.guesses}
    JOIN ${schema.claims} ON ${schema.claims.id} = ${schema.guesses.claimId}
    WHERE ${schema.guesses.userId} = ${userId}
      AND ${schema.guesses.isCorrect} = false
      AND ${schema.guesses.createdAt} >= ${sevenDaysAgo}
    GROUP BY ${schema.claims.category}
    ORDER BY COUNT(*) DESC
    LIMIT 1
  `);
  const blindSpotRow = blindSpotResult.rows[0];

  // 3. Replay claim — most recent wrong guess with full claim details
  const replayResult = await db.execute<{
    id: string;
    text: string;
    explanation: string;
    source_url: string | null;
  }>(sql`
    SELECT
      ${schema.claims.id}::text AS id,
      ${schema.claims.text}::text AS text,
      ${schema.claims.explanation}::text AS explanation,
      ${schema.claims.sourceUrl}::text AS source_url
    FROM ${schema.guesses}
    JOIN ${schema.claims} ON ${schema.claims.id} = ${schema.guesses.claimId}
    WHERE ${schema.guesses.userId} = ${userId}
      AND ${schema.guesses.isCorrect} = false
      AND ${schema.guesses.createdAt} >= ${sevenDaysAgo}
    ORDER BY ${schema.guesses.createdAt} DESC
    LIMIT 1
  `);
  const replayRow = replayResult.rows[0];

  res.json({
    report: {
      accuracy: totalNum > 0 ? `${correctNum}/${totalNum}` : '0/0',
      blind_spot: blindSpotRow?.category
        ? `You're most often fooled by ${blindSpotRow.category}`
        : null,
      replay_claim: replayRow
        ? {
            text: replayRow.text,
            explanation: replayRow.explanation,
            source_url: replayRow.source_url,
          }
        : null,
    },
  });
});

export default router;