/**
 * Weekly blind-spot report cron — runs at 00:00 UTC on Sundays. Emails
 * each user with a recent guess their existing weekly_reports row.
 *
 * Notes on scope:
 *   - We don't auto-regenerate here. Regeneration is an AI-heavy call
 *     (4 structured outputs in parallel) — we let the dashboard's
 *     `POST /api/reports/weekly/regenerate` endpoint do that on demand
 *     so the operator / demo user has explicit control. The cron only
 *     *emails* whatever is already cached.
 *   - First-time users who haven't voted don't get an email.
 *
 * Idempotency: re-sends the most-recent report row. Same caveat as
 * `digest.ts` — accepted for the hackathon.
 */

import { and, desc, eq, gte } from 'drizzle-orm';
import { db, schema } from '@/db';
import { logger } from '@/utils/logger';
import { sendWeeklyReportEmail } from '@/email/send';

export interface WeeklyReportRunSummary {
  candidates: number;
  sent: number;
  dryRun: boolean;
  skipped: number;
  failed: number;
  durationMs: number;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Send the weekly report email to every user who has voted in the
 * past 7 days AND has a cached `weekly_reports` row to render.
 */
export async function runWeeklyReport(): Promise<WeeklyReportRunSummary> {
  const start = Date.now();

  const since = new Date(Date.now() - SEVEN_DAYS_MS).toISOString();

  // 1. Users with at least one guess in the past 7 days AND not bounced.
  const candidates = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .innerJoin(schema.guesses, eq(schema.guesses.userId, schema.users.id))
    .where(
      and(
        gte(schema.guesses.createdAt, new Date(since)),
        eq(schema.users.emailBounced, false)
      )
    )
    .groupBy(schema.users.id);

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  let dryRun = false;

  for (const c of candidates) {
    const outcome = await sendWeeklyReportEmail(c.id);
    if (outcome.ok) {
      sent++;
      if (outcome.dryRun) dryRun = true;
    } else if (outcome.skipped) {
      // Most common: 'no-report' (user voted but their report was never
      // regenerated). Silently skip — they'll see it on the web next time.
      skipped++;
    } else {
      failed++;
    }
  }

  const summary: WeeklyReportRunSummary = {
    candidates: candidates.length,
    sent,
    dryRun,
    skipped,
    failed,
    durationMs: Date.now() - start,
  };
  logger.info({ ...summary }, '[job] weekly-report complete');
  return summary;
}