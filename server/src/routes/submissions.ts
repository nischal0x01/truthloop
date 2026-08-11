/**
 * Submissions routes — live AI fact-check on user-submitted claims.
 * Mounted at /api/submissions
 *
 * POST /api/submissions         — submit a claim for AI fact-check
 * GET  /api/submissions/me      — user's own submissions
 */
import { Router, type Request, type Response, type NextFunction } from 'express';
import { eq, desc } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/db';
import { AppError } from '@/middleware/errorHandler';
import { verifyClaim } from '@/ai';

const router = Router();

function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) throw new AppError(401, 'You must be signed in.');
  next();
}

// ─── Schemas ─────────────────────────────────────────────────────────────────

const submitSchema = z.object({
  text: z.string().trim().min(1).max(1000, 'Claim must be 1000 characters or fewer.'),
});

// ─── POST /api/submissions ────────────────────────────────────────────────────
router.post('/', requireAuth, async (req: Request, res: Response) => {
  const userId = (req.user as { id: string }).id;
  const { text } = submitSchema.parse(req.body);

  // Run AI fact-check
  const verification = await verifyClaim({
    rawText: text,
    sourceName: 'user-submission',
  });

  // Count today's submissions for this user (for +5 point bonus on first 20)
  const today = new Date().toISOString().split('T')[0];
  const todayStart = new Date(`${today}T00:00:00.000Z`);

  const [inserted] = await db
    .insert(schema.userSubmissions)
    .values({
      userId,
      text,
      aiVerdict: (verification.verdict === 'unverifiable' ? 'unverified' : verification.verdict) as 'real' | 'fake' | 'unverified',
      aiConfidence: verification.confidence,
      aiExplanation: verification.explanation,
      aiSources: verification.sourceUrl ? [{ url: verification.sourceUrl, title: 'Source' }] : null,
      aiCategory: verification.category,
    })
    .returning();

  res.status(201).json({
    submission: {
      id: inserted.id,
      text: inserted.text,
      createdAt: inserted.createdAt,
    },
    factCheck: {
      verdict: verification.verdict,
      confidence: verification.confidence,
      explanation: verification.explanation,
      sources: verification.sourceUrl ? [{ url: verification.sourceUrl, title: 'Source' }] : [],
      category: verification.category,
    },
  });
});

// ─── GET /api/submissions/me ────────────────────────────────────────────────
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  const userId = (req.user as { id: string }).id;

  const rows = await db
    .select()
    .from(schema.userSubmissions)
    .where(eq(schema.userSubmissions.userId, userId))
    .orderBy(desc(schema.userSubmissions.createdAt))
    .limit(50);

  res.json({
    submissions: rows.map((s) => ({
      id: s.id,
      text: s.text,
      verdict: s.aiVerdict,
      confidence: s.aiConfidence,
      explanation: s.aiExplanation,
      sourceUrl: s.aiSources?.[0]?.url ?? null,
      category: s.aiCategory,
      createdAt: s.createdAt,
    })),
  });
});

export default router;
