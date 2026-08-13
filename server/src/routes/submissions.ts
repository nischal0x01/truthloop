/**
 * Submissions routes — `/submit` tab's live AI fact-check flow.
 * Mounted at /api/submissions
 *
 *   POST /api/submissions     → fact-check a user-submitted claim (auth required).
 *   GET  /api/submissions/me  → list the caller's recent submissions (newest first).
 *
 * Spec reference: `.ai/02-business-logic.md` §2.5 + `.ai/05-ai-prompts.md` §2.
 *
 * Pipeline:
 *   1. Validate text length (1–1000 chars per spec).
 *   2. Call `claude-opus-4-1` via `generateStructured({ schema: factCheckSchema })`.
 *      Returns the typed `factCheckFallback` if Claude is down / unparseable.
 *   3. Persist a `user_submissions` row with the flattened explanation string.
 *      Submissions NEVER enter the main claim feed.
 *   4. Award +5 points per `.ai/02-business-logic.md` §2.4 (≤20 per day).
 *
 * Caching: submissions are append-only from the user's perspective, so the
 * list cache can be invalidated on each new POST.
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { desc, eq, sql, and, gte } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/db';
import { AppError } from '@/middleware/errorHandler';
import {
  buildLiveFactCheckPrompt,
  factCheckFallback,
  factCheckSchema,
  generateStructured,
  type FactCheck,
} from '@/ai';

/* ── Setup ── */

const router = Router();

function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    throw new AppError(401, 'You must be signed in.');
  }
  next();
}

/** Per `.ai/02-business-logic.md` §2.4 — capped engagement incentive. */
const POINTS_PER_SUBMISSION = 5;
const MAX_SUBMISSIONS_PER_DAY_FOR_POINTS = 20;

/* ── Normalizer ── */

/**
 * Flatten the rich AI shape into the single `ai_explanation` text column the
 * DB stores. Keeps the headline bold and the reasons as a bullet list so the
 * admin / moderator view renders the same way the user-facing result card does.
 */
function flattenExplanation(fc: FactCheck): string {
  const headline = fc.headline.trim();
  const bullets = fc.reasons.map((r) => `• ${r.trim()}`).join('\n');
  return bullets ? `${headline}\n\n${bullets}` : headline;
}

/* ── Response shapes ── */

export interface SubmissionOut {
  id: string;
  text: string;
  aiVerdict: 'real' | 'fake' | 'unverified' | null;
  aiConfidence: number | null;
  aiExplanation: string | null;
  aiSources: Array<{ url: string; title: string; snippet?: string }> | null;
  aiCategory: string | null;
  createdAt: string;
}

export interface SubmitResponse {
  submission: SubmissionOut;
  factCheck: FactCheck;
  pointsAwarded: number;
}

export interface MySubmissionsResponse {
  submissions: SubmissionOut[];
}

/* ── Helpers ── */

async function fetchSubmissionsForUser(
  userId: string,
  limit: number
): Promise<SubmissionOut[]> {
  const rows = await db
    .select({
      id: schema.userSubmissions.id,
      text: schema.userSubmissions.text,
      aiVerdict: schema.userSubmissions.aiVerdict,
      aiConfidence: schema.userSubmissions.aiConfidence,
      aiExplanation: schema.userSubmissions.aiExplanation,
      aiSources: schema.userSubmissions.aiSources,
      aiCategory: schema.userSubmissions.aiCategory,
      createdAt: schema.userSubmissions.createdAt,
    })
    .from(schema.userSubmissions)
    .where(eq(schema.userSubmissions.userId, userId))
    .orderBy(desc(schema.userSubmissions.createdAt))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    text: r.text,
    aiVerdict: r.aiVerdict,
    aiConfidence: r.aiConfidence,
    aiExplanation: r.aiExplanation,
    aiSources: (r.aiSources ?? null) as SubmissionOut['aiSources'],
    aiCategory: r.aiCategory,
    createdAt: r.createdAt.toISOString(),
  }));
}

/* ── Schemas ── */

const submitSchema = z.object({
  text: z.string().trim().min(1, 'Please paste a headline or claim.').max(1000, 'Keep submissions to 1000 characters or fewer.'),
});

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

/* ── POST /api/submissions ─────────────────────────────────────────── */

router.post('/', requireAuth, async (req, res) => {
  const { text } = submitSchema.parse(req.body);
  const userId = (req.user as { id: string }).id;

  // 1. AI fact-check. STRONG_MODEL = claude-opus-4-1 per spec §2.
  const { system, prompt, userInput } = buildLiveFactCheckPrompt({ text });
  const factCheck = await generateStructured<FactCheck>({
    system,
    prompt,
    userInput,
    schema: factCheckSchema,
    fallback: factCheckFallback,
    model: 'strong',
  });

  // 2. Award points only if the user hasn't hit the daily cap.
  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);
  const [todayCount] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(schema.userSubmissions)
    .where(
      and(
        eq(schema.userSubmissions.userId, userId),
        gte(schema.userSubmissions.createdAt, dayStart)
      )
    );

  const underCap = (todayCount?.count ?? 0) < MAX_SUBMISSIONS_PER_DAY_FOR_POINTS;
  const pointsAwarded = underCap ? POINTS_PER_SUBMISSION : 0;

  // 3. Persist submission + award points in a single transaction so a
  //    point-grant without a recorded submission can't happen.
  const submission = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(schema.userSubmissions)
      .values({
        userId,
        text,
        aiVerdict: factCheck.verdict,
        aiConfidence: factCheck.confidence,
        aiExplanation: flattenExplanation(factCheck),
        aiSources: factCheck.sources ?? [],
        aiCategory: factCheck.category,
      })
      .returning();

    if (pointsAwarded > 0) {
      await tx
        .update(schema.users)
        .set({
          points: sql`${schema.users.points} + ${pointsAwarded}`,
          updatedAt: sql`NOW()`,
        })
        .where(eq(schema.users.id, userId));
    }

    return row;
  });

  const submissionOut: SubmissionOut = {
    id: submission.id,
    text: submission.text,
    aiVerdict: submission.aiVerdict,
    aiConfidence: submission.aiConfidence,
    aiExplanation: submission.aiExplanation,
    aiSources: (submission.aiSources ?? null) as SubmissionOut['aiSources'],
    aiCategory: submission.aiCategory,
    createdAt: submission.createdAt.toISOString(),
  };

  res.status(201).json({
    submission: submissionOut,
    factCheck,
    pointsAwarded,
  } satisfies SubmitResponse);
});

/* ── GET /api/submissions/me ───────────────────────────────────────── */

router.get('/me', requireAuth, async (req, res) => {
  const userId = (req.user as { id: string }).id;
  const { limit } = listQuerySchema.parse(req.query);
  const submissions = await fetchSubmissionsForUser(userId, limit);
  res.json({ submissions } satisfies MySubmissionsResponse);
});

export default router;
