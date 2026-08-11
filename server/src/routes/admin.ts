/**
 * Admin routes — AI Claim Discovery management.
 *
 * All routes require admin authentication (is_admin=true on the user).
 *
 * GET  /api/admin/discovered-claims  — list with filters (decision, adminFlagged, isPublished)
 * GET  /api/admin/discovered-claims/:id — single claim detail
 * POST /api/admin/discovered-claims/:id/publish — manually publish to claims feed
 * POST /api/admin/discovered-claims/:id/reject  — mark as rejected (admin review done)
 * GET  /api/admin/scrape-runs        — list scrape run history
 * POST /api/admin/scrape/run-now     — trigger a scrape immediately
 *
 * No Zod body validation needed for GET; mutating actions are simple POST with no body.
 */

import { Router } from 'express';
import { db, schema } from '@/db/index.js';
import { eq, desc, and, sql } from 'drizzle-orm';
import { aiDiscoveredClaims, aiScrapeRuns } from '@/db/schema/ai-discovery.js';
import { claims } from '@/db/schema/claims.js';
import { broadcast } from '@/sse/broadcaster.js';
import { runClaimDiscovery } from '@/jobs/claimDiscovery.js';
import { requireAuth, requireAdmin } from '@/middleware/auth.js';
import { AppError } from '@/middleware/errorHandler.js';

const router = Router();

// ─── Auth middleware (admin check) ──────────────────────────────────────────
// Uses the requireAdmin middleware imported above

// ─── GET /api/admin/discovered-claims ──────────────────────────────────────
router.get('/discovered-claims', requireAdmin, async (req, res) => {
  const {
    decision,
    adminFlagged,
    isPublished,
    limit = '50',
    offset = '0',
  } = req.query as Record<string, string>;

  const conditions = [];

  if (decision) {
    conditions.push(eq(aiDiscoveredClaims.decision, decision as any));
  }
  if (adminFlagged !== undefined) {
    conditions.push(eq(aiDiscoveredClaims.adminFlagged, adminFlagged === 'true'));
  }
  if (isPublished !== undefined) {
    conditions.push(eq(aiDiscoveredClaims.isPublished, isPublished === 'true'));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select()
    .from(aiDiscoveredClaims)
    .where(where)
    .orderBy(desc(aiDiscoveredClaims.processedAt))
    .limit(parseInt(limit, 10))
    .offset(parseInt(offset, 10));

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(aiDiscoveredClaims)
    .where(where);

  res.json({ claims: rows, total: Number(count), limit: parseInt(limit), offset: parseInt(offset) });
});

// ─── GET /api/admin/discovered-claims/:id ────────────────────────────────────
router.get('/discovered-claims/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;

  const [row] = await db
    .select()
    .from(aiDiscoveredClaims)
    .where(eq(aiDiscoveredClaims.id, id as any))
    .limit(1);

  if (!row) {
    throw new AppError(404, 'Discovered claim not found');
  }

  res.json(row);
});

// ─── POST /api/admin/discovered-claims/:id/publish ───────────────────────────
router.post('/discovered-claims/:id/publish', requireAdmin, async (req, res) => {
  const { id } = req.params;

  const [discovered] = await db
    .select()
    .from(aiDiscoveredClaims)
    .where(eq(aiDiscoveredClaims.id, id as any))
    .limit(1);

  if (!discovered) {
    throw new AppError(404, 'Discovered claim not found');
  }

  if (discovered.isPublished) {
    throw new AppError(400, 'Claim is already published');
  }

  // Map scam type → category
  const categoryMap: Record<string, string> = {
    phishing: 'unverified_claim',
    fake_news: 'misleading_omission',
    misleading: 'misleading_omission',
    investment_fraud: 'conspiracy_theory',
    impersonation: 'misattributed_threat',
    none: 'unverified_claim',
  };

  const category = categoryMap[discovered.filter3ScamType] ?? 'unverified_claim';

  // Publish to claims table
  const [published] = await db
    .insert(claims)
    .values({
      text: discovered.rawText,
      verdict: discovered.filter1Verdict === 'real' ? 'real' : 'fake',
      category,
      explanation: discovered.filter3Explanation ?? discovered.filter1Reason ?? 'Admin-published claim.',
      sourceUrl: discovered.sourceUrl,
      isPublished: true,
      publishedAt: new Date(),
      trendingScore: 1.0,
      voteCount: 0,
    })
    .returning({ id: claims.id });

  // Update discovered claim
  await db
    .update(aiDiscoveredClaims)
    .set({
      isPublished: true,
      publishedClaimId: published.id,
      decision: 'publish_as_scam', // upgrade decision
      adminReviewed: true,
      reviewedAt: new Date(),
    })
    .where(eq(aiDiscoveredClaims.id, id as any));

  // Broadcast to all connected clients
  broadcast('new-claim', { id: published.id, text: discovered.rawText });

  res.json({ success: true, publishedClaimId: published.id });
});

// ─── POST /api/admin/discovered-claims/:id/reject ───────────────────────────
router.post('/discovered-claims/:id/reject', requireAdmin, async (req, res) => {
  const { id } = req.params;

  const [updated] = await db
    .update(aiDiscoveredClaims)
    .set({
      decision: 'reject',
      adminReviewed: true,
      reviewedAt: new Date(),
    })
    .where(eq(aiDiscoveredClaims.id, id as any))
    .returning();

  if (!updated) {
    throw new AppError(404, 'Discovered claim not found');
  }

  res.json({ success: true });
});

// ─── GET /api/admin/scrape-runs ─────────────────────────────────────────────
router.get('/scrape-runs', requireAdmin, async (req, res) => {
  const { limit = '20', offset = '0' } = req.query as Record<string, string>;

  const rows = await db
    .select()
    .from(aiScrapeRuns)
    .orderBy(desc(aiScrapeRuns.startedAt))
    .limit(parseInt(limit, 10))
    .offset(parseInt(offset, 10));

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(aiScrapeRuns);

  res.json({ runs: rows, total: Number(count) });
});

// ─── POST /api/admin/scrape/run-now ─────────────────────────────────────────
router.post('/scrape/run-now', requireAdmin, async (req, res) => {
  // Fire and forget — run in background
  runClaimDiscovery().catch((err) => {
    console.error('[admin] run-now failed:', err);
  });

  res.json({ success: true, message: 'Claim discovery started in background' });
});

export default router;
