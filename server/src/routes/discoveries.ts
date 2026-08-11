/**
 * Discovered Claims routes — public-facing view of AI-scraped claims.
 * Mounted at /api/discoveries
 *
 * GET /api/discoveries          — list recent discoveries (public)
 * GET /api/discoveries/:id     — single discovery detail
 *
 * These are claims scraped from the web and run through the 3-filter AI pipeline.
 * Shown to regular users as a "what's trending online" discovery feed.
 */
import { Router, type Request, type Response } from 'express';
import { eq, desc, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { aiDiscoveredClaims } from '@/db/schema/ai-discovery.js';
import { AppError } from '@/middleware/errorHandler.js';

const router = Router();

/* ── GET /api/discoveries ─────────────────────────────────────────── */
router.get('/', async (req: Request, res: Response) => {
  const limit = Math.min(parseInt(String(req.query.limit ?? '20'), 10), 50);
  const offset = parseInt(String(req.query.offset ?? '0'), 10);

  // Only show claims that passed at least one positive filter — skip raw/rejected items.
  // Shown in reverse chronological order (most recent scrape first).
  const rows = await db
    .select({
      id: aiDiscoveredClaims.id,
      rawText: aiDiscoveredClaims.rawText,
      sourceUrl: aiDiscoveredClaims.sourceUrl,
      sourceName: aiDiscoveredClaims.sourceName,
      scrapedAt: aiDiscoveredClaims.scrapedAt,
      filter1Verdict: aiDiscoveredClaims.filter1Verdict,
      filter1Confidence: aiDiscoveredClaims.filter1Confidence,
      filter1Reason: aiDiscoveredClaims.filter1Reason,
      filter2FeelsScam: aiDiscoveredClaims.filter2FeelsScam,
      filter2SentimentScore: aiDiscoveredClaims.filter2SentimentScore,
      filter3IsScam: aiDiscoveredClaims.filter3IsScam,
      filter3ScamType: aiDiscoveredClaims.filter3ScamType,
      filter3Severity: aiDiscoveredClaims.filter3Severity,
      filter3Explanation: aiDiscoveredClaims.filter3Explanation,
      decision: aiDiscoveredClaims.decision,
      processedAt: aiDiscoveredClaims.processedAt,
    })
    .from(aiDiscoveredClaims)
    .where(
      // Show anything that's been through the pipeline and has a non-reject decision
      sql`${aiDiscoveredClaims.decision} IN ('publish_as_scam', 'publish_as_misinfo', 'flag_review')`
    )
    .orderBy(desc(aiDiscoveredClaims.processedAt))
    .limit(limit)
    .offset(offset);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(aiDiscoveredClaims)
    .where(
      sql`${aiDiscoveredClaims.decision} IN ('publish_as_scam', 'publish_as_misinfo', 'flag_review')`
    );

  res.json({
    discoveries: rows.map((r) => ({
      id: r.id,
      text: r.rawText,
      sourceUrl: r.sourceUrl,
      sourceName: r.sourceName,
      scrapedAt: r.scrapedAt?.toISOString() ?? null,
      aiVerdict: r.filter1Verdict,
      aiConfidence: r.filter1Confidence,
      aiReason: r.filter1Reason,
      feelsScam: r.filter2FeelsScam,
      scamSentiment: r.filter2SentimentScore,
      isScam: r.filter3IsScam,
      scamType: r.filter3ScamType,
      scamSeverity: r.filter3Severity,
      scamExplanation: r.filter3Explanation,
      decision: r.decision,
      processedAt: r.processedAt?.toISOString() ?? null,
    })),
    total: Number(count),
    limit,
    offset,
  });
});

/* ── GET /api/discoveries/:id ─────────────────────────────────────── */
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const uuidSchema = z.string().uuid('Invalid discovery ID.');

  try {
    uuidSchema.parse(id);
  } catch {
    throw new AppError(400, 'Invalid discovery ID.');
  }

  const [row] = await db
    .select({
      id: aiDiscoveredClaims.id,
      rawText: aiDiscoveredClaims.rawText,
      sourceUrl: aiDiscoveredClaims.sourceUrl,
      sourceName: aiDiscoveredClaims.sourceName,
      scrapedAt: aiDiscoveredClaims.scrapedAt,
      filter1Verdict: aiDiscoveredClaims.filter1Verdict,
      filter1Confidence: aiDiscoveredClaims.filter1Confidence,
      filter1Reason: aiDiscoveredClaims.filter1Reason,
      filter2FeelsScam: aiDiscoveredClaims.filter2FeelsScam,
      filter2SentimentScore: aiDiscoveredClaims.filter2SentimentScore,
      filter2PublicConcern: aiDiscoveredClaims.filter2PublicConcern,
      filter3IsScam: aiDiscoveredClaims.filter3IsScam,
      filter3ScamType: aiDiscoveredClaims.filter3ScamType,
      filter3Severity: aiDiscoveredClaims.filter3Severity,
      filter3Explanation: aiDiscoveredClaims.filter3Explanation,
      decision: aiDiscoveredClaims.decision,
      isPublished: aiDiscoveredClaims.isPublished,
      adminReviewed: aiDiscoveredClaims.adminReviewed,
      processedAt: aiDiscoveredClaims.processedAt,
    })
    .from(aiDiscoveredClaims)
    .where(eq(aiDiscoveredClaims.id, id as any))
    .limit(1);

  if (!row) throw new AppError(404, 'Discovery not found.');

  res.json({
    discovery: {
      id: row.id,
      text: row.rawText,
      sourceUrl: row.sourceUrl,
      sourceName: row.sourceName,
      scrapedAt: row.scrapedAt?.toISOString() ?? null,
      aiVerdict: row.filter1Verdict,
      aiConfidence: row.filter1Confidence,
      aiReason: row.filter1Reason,
      feelsScam: row.filter2FeelsScam,
      scamSentiment: row.filter2SentimentScore,
      publicConcern: row.filter2PublicConcern,
      isScam: row.filter3IsScam,
      scamType: row.filter3ScamType,
      scamSeverity: row.filter3Severity,
      scamExplanation: row.filter3Explanation,
      decision: row.decision,
      isPublished: row.isPublished,
      adminReviewed: row.adminReviewed,
      processedAt: row.processedAt?.toISOString() ?? null,
    },
  });
});

export default router;
