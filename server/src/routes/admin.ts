/**
 * Admin routes — operator-only escape hatches.
 *
 * Mounted at /api/admin
 *
 * Everything here is gated on `req.user.isAdmin === true`. The demo account
 * (demo@truthloop.app, is_admin=true) is the only path through this router
 * during the hackathon — no role system, no team flag, just the boolean.
 *
 * Endpoints:
 *   POST /admin/harvest
 *     Manually run one pass of the hourly claim-harvester cron
 *     (server/src/jobs/claimHarvester.ts). Useful for demoing the
 *     auto-ingest pipeline without waiting for the top-of-hour.
 *     Returns the same `ClaimHarvestSummary` the cron logs.
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { AppError } from '@/middleware/errorHandler';
import { runClaimHarvest, type ClaimHarvestSummary } from '@/jobs/claimHarvester';
import { logger } from '@/utils/logger';

const router = Router();

/**
 * Reject unauthenticated requests OR authenticated non-admins.
 * Throws 401 (not signed in) vs 403 (signed in but not admin) so the
 * UI can distinguish "log in first" from "wrong account".
 */
function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  const user = req.user as { id: string; isAdmin?: boolean } | undefined;
  if (!user) {
    throw new AppError(401, 'You must be signed in.');
  }
  if (!user.isAdmin) {
    throw new AppError(403, 'Admin privileges required.');
  }
  next();
}

// ──────────────────────────────────────────────────────────────────────────
// POST /admin/harvest
// Trigger one synchronous claim-harvest pass. Always returns the summary
// — the underlying job is non-fatal, so even on a fully failed run the
// caller gets `inserted: 0` instead of a 500. Only auth errors throw.
// ──────────────────────────────────────────────────────────────────────────
router.post('/harvest', requireAdmin, async (_req: Request, res: Response) => {
  logger.info('[admin] /harvest triggered by hand');
  const summary: ClaimHarvestSummary = await runClaimHarvest();
  res.json({ ok: true, summary });
});

export default router;
