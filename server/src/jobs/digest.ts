/**
 * Daily digest cron job — runs at 08:00 UTC, emails every user with
 * `email_digest_enabled = true AND email_bounced = false`.
 *
 * Idempotency: the cron can fire twice on the same day (deploys, manual
 * triggers) and we accept re-sending. Resend's free tier won't double-
 * charge the demo account.
 *
 * Manual trigger:
 *   tsx -e "import('./src/jobs/digest.js').then(m => m.runDigest().then(() => process.exit(0)))"
 */

import { and, eq, or, isNull } from 'drizzle-orm';
import { db, schema } from '@/db';
import { logger } from '@/utils/logger';
import { sendDigest } from '@/email/send';

export interface DigestRunSummary {
  totalUsers: number;
  sent: number;
  dryRun: boolean;
  skipped: number;
  failed: number;
  durationMs: number;
}

/**
 * Send today's digest to every eligible user. Logs one summary line.
 */
export async function runDigest(): Promise<DigestRunSummary> {
  const start = Date.now();

  const recipients = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .leftJoin(schema.userSettings, eq(schema.userSettings.userId, schema.users.id))
    .where(
      and(
        eq(schema.users.emailBounced, false),
        // Treat NULL `email_digest_enabled` as `true` (the default).
        or(
          eq(schema.userSettings.emailDigestEnabled, true),
          isNull(schema.userSettings.emailDigestEnabled)
        )
      )
    );

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  let dryRun = false;

  for (const r of recipients) {
    const outcome = await sendDigest(r.id);
    if (outcome.ok) {
      sent++;
      if (outcome.dryRun) dryRun = true;
    } else if (outcome.skipped) {
      skipped++;
    } else {
      failed++;
    }
  }

  const summary: DigestRunSummary = {
    totalUsers: recipients.length,
    sent,
    dryRun,
    skipped,
    failed,
    durationMs: Date.now() - start,
  };
  logger.info({ ...summary }, '[job] digest complete');
  return summary;
}