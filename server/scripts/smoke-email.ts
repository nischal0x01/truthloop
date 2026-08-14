/**
 * Smoke test for the email pipeline (dry-run mode).
 *
 * Run: `npx tsx scripts/smoke-email.ts`
 *
 * Exercises every email surface end-to-end:
 *   1. sendDigest              → daily digest to the demo user
 *   2. sendWeeklyReportEmail   → weekly blind-spot report to the demo user
 *   3. sendInstantAlertsForHighSeverityItems(today) → high-severity alerts
 *
 * Expected: every call logs `[email dry-run] sendEmail` with `to=`, `subject=`,
 * `htmlLength` populated. No Resend key required. No external network.
 */

import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { db, schema } from '../src/db/index.js';
import { sendDigest, sendWeeklyReportEmail, sendInstantAlertsForHighSeverityItems } from '../src/email/send.js';

const DEMO_EMAIL = 'demo@truthloop.app';

async function findDemoUserId(): Promise<string | null> {
  const [row] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, DEMO_EMAIL))
    .limit(1);
  return row?.id ?? null;
}

async function main() {
  const userId = await findDemoUserId();
  if (!userId) {
    console.error('Demo user not found. Run the seed script first.');
    process.exit(1);
  }
  console.log(`[smoke] demo user id = ${userId}`);

  console.log('\n[smoke] 1/3 sendDigest');
  const digest = await sendDigest(userId);
  console.log(`        outcome = ${JSON.stringify(digest)}`);

  console.log('\n[smoke] 2/3 sendWeeklyReportEmail');
  const weekly = await sendWeeklyReportEmail(userId);
  console.log(`        outcome = ${JSON.stringify(weekly)}`);

  console.log('\n[smoke] 3/3 sendInstantAlertsForHighSeverityItems(today)');
  const today = new Date().toISOString().slice(0, 10);
  const instant = await sendInstantAlertsForHighSeverityItems(today);
  console.log(`        outcome = ${JSON.stringify(instant)}`);

  console.log('\n[smoke] DONE — check server logs above for [email dry-run] lines.');
  process.exit(0);
}

main().catch((err) => {
  console.error('[smoke] FAILED:', err);
  process.exit(1);
});
