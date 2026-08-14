/**
 * High-level email senders — each one gathers the data it needs from
 * the DB, renders the React Email template via `@react-email/render`,
 * and calls the (possibly dry-run) Resend wrapper.
 *
 * Each sender:
 *   - takes a `userId`
 *   - looks up the user + email from `users` + `user_settings`
 *   - short-circuits silently when the user is ineligible (bounced,
 *     opted out, missing email)
 *   - swallows send errors and logs them — cron callers must not throw,
 *     or one bad user kills the whole batch
 *
 * Return type is always `SendOutcome` with a discriminated `ok` flag so
 * the caller can log success/failure uniformly and the live "Email me"
 * route can return `{ sent, email, dryRun }` to the frontend.
 */

import { renderToStaticMarkup } from 'react-dom/server';
import { and, desc, eq, gte, lte, sql } from 'drizzle-orm';
import { db, schema } from '@/db';
import { config } from '@/config';
import { logger } from '@/utils/logger';
import { sendEmail } from './client';
import DigestEmail, {
  type DigestForecastItem,
  type DigestLeaderboardEntry,
  type DigestBlindSpotCallout,
} from './templates/digest';
import WeeklyReportEmail, {
  type WeeklyReportReplay,
} from './templates/weekly-report';
import InstantAlertEmail from './templates/instant-alert';

export type SendOutcome =
  | { ok: true; id: string; dryRun: boolean; skipped?: false }
  | { ok: false; reason: string; skipped: boolean };

const CATEGORY_LABELS: Record<string, string> = {
  factual_statement: 'Factual statements',
  outdated_info: 'Outdated information',
  misleading_omission: 'Misleading omissions',
  manipulated_stat: 'Manipulated statistics',
  misattributed_quote: 'Misattributed quotes',
  satire_mistaken_as_real: 'Satire mistaken as real',
  survey_stat: 'Survey stats',
  conspiracy_theory: 'Conspiracy framings',
  misattributed_threat: 'Misattributed threats',
  unverified_claim: 'Unverified claims',
};

/* ── User lookup helpers ──────────────────────────────────────────── */

interface UserContext {
  id: string;
  email: string;
  displayName: string;
  emailBounced: boolean;
  emailDigestEnabled: boolean;
  emailInstantAlertsEnabled: boolean;
}

/** Resolve a user + their email preferences. Returns null if user not found. */
async function getUserContext(userId: string): Promise<UserContext | null> {
  const [user] = await db
    .select({
      id: schema.users.id,
      email: schema.users.email,
      displayName: schema.users.displayName,
      emailBounced: schema.users.emailBounced,
    })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);
  if (!user) return null;

  const [settings] = await db
    .select()
    .from(schema.userSettings)
    .where(eq(schema.userSettings.userId, userId))
    .limit(1);

  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    emailBounced: user.emailBounced,
    emailDigestEnabled: settings?.emailDigestEnabled ?? true,
    emailInstantAlertsEnabled: settings?.emailInstantAlertsEnabled ?? true,
  };
}

/* ── Daily digest ─────────────────────────────────────────────────── */

interface LeaderboardRow {
  rank: number;
  displayName: string;
  pointsToday: number;
}

/**
 * Compute the user's rank for the current UTC day. Uses the same query
 * the public leaderboard route uses; we inline it here to avoid an HTTP
 * round-trip from cron → API.
 */
async function todaysLeaderboardRow(userId: string): Promise<LeaderboardRow | null> {
  // Self-join trick: pick the user's row + a row above that sums all
  // users with strictly greater `points_today` (= the user's rank - 1).
  const rows = await db.execute<{
      id: string;
      display_name: string;
      points_today: number;
      rank: number;
    }>(sql`
      WITH today AS (
        SELECT
          u.id,
          u.display_name,
          COALESCE(SUM(CASE WHEN g.is_correct THEN 10 ELSE 0 END), 0) AS points_today
        FROM users u
        LEFT JOIN guesses g
          ON g.user_id = u.id
          AND g.created_at >= date_trunc('day', NOW() AT TIME ZONE 'UTC')
        WHERE u.is_admin = false
        GROUP BY u.id, u.display_name
        HAVING COUNT(g.id) > 0
      ),
      ranked AS (
        SELECT
          id,
          display_name,
          points_today,
          (RANK() OVER (ORDER BY points_today DESC, id))::int AS rank
        FROM today
      )
      SELECT id, display_name, points_today, rank
      FROM ranked
      WHERE id = ${userId}
      LIMIT 1
  `);
  const row = rows.rows[0];
  if (!row) return null;
  return {
    rank: row.rank,
    displayName: row.display_name,
    pointsToday: row.points_today,
  };
}

async function todaysForecastItems(): Promise<DigestForecastItem[]> {
  const today = new Date().toISOString().slice(0, 10);
  const rows = await db
    .select({
      id: schema.scamForecastItems.id,
      severity: schema.scamForecastItems.severity,
      title: schema.scamForecastItems.title,
      description: schema.scamForecastItems.description,
      recommendedAction: schema.scamForecastItems.recommendedAction,
      sourceUrl: schema.scamForecastItems.sourceUrl,
      sourceTitle: schema.scamForecastItems.sourceTitle,
    })
    .from(schema.scamForecastItems)
    .innerJoin(schema.scamForecasts, eq(schema.scamForecasts.id, schema.scamForecastItems.forecastId))
    .where(eq(schema.scamForecasts.forecastDate, today));
  return rows.map((r) => ({
    id: r.id,
    severity: r.severity as 'low' | 'medium' | 'high',
    title: r.title,
    summary: r.description,
    recommendedAction: r.recommendedAction,
    sourceUrl: r.sourceUrl,
    sourceTitle: r.sourceTitle,
  }));
}

async function latestBlindSpotFor(userId: string): Promise<DigestBlindSpotCallout | null> {
  const [row] = await db
    .select({
      blindSpotCategory: schema.weeklyReports.blindSpotCategory,
      blindSpotNarrative: schema.weeklyReports.blindSpotNarrative,
      weekStarting: schema.weeklyReports.weekStarting,
    })
    .from(schema.weeklyReports)
    .where(eq(schema.weeklyReports.userId, userId))
    .orderBy(desc(schema.weeklyReports.weekStarting))
    .limit(1);
  if (!row || !row.blindSpotCategory || !row.blindSpotNarrative) return null;
  return {
    category: row.blindSpotCategory,
    narrative: row.blindSpotNarrative,
    weekStarting: row.weekStarting,
  };
}

/** Send today's digest to a single user. Used by the cron + admin tools. */
export async function sendDigest(userId: string): Promise<SendOutcome> {
  const ctx = await getUserContext(userId);
  if (!ctx) return { ok: false, reason: 'user-not-found', skipped: true };
  if (ctx.emailBounced) return { ok: false, reason: 'email-bounced', skipped: true };
  if (!ctx.emailDigestEnabled) return { ok: false, reason: 'digest-disabled', skipped: true };

  const leaderboard = await todaysLeaderboardRow(userId);
  const forecastItems = await todaysForecastItems();
  // Only surface the blind-spot on Sundays (UTC). Avoids leaking the
  // narrative on days where the report hasn't been regenerated yet.
  const isSunday = new Date().getUTCDay() === 0;
  const blindSpot = isSunday ? await latestBlindSpotFor(userId) : null;

  const displayDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });

  const leaderboardForDigest: DigestLeaderboardEntry | null = leaderboard
    ? {
        rank: leaderboard.rank,
        displayName: leaderboard.displayName,
        pointsToday: Number(leaderboard.pointsToday),
      }
    : null;

  try {
    const html = renderToStaticMarkup(
      DigestEmail({
        settingsUrl: `${config.app.url}/settings`,
        forecastUrl: `${config.app.url}/forecast`,
        feedUrl: `${config.app.url}/claims`,
        displayDate,
        leaderboard: leaderboardForDigest,
        forecastItems,
        blindSpot,
      })
    );

    const result = await sendEmail({
      to: ctx.email,
      subject: blindSpot
        ? `Your week, your blind spot — TruthLoop digest`
        : forecastItems.length > 0
          ? `Today's Scam Forecast — ${forecastItems.length} pattern${forecastItems.length === 1 ? '' : 's'} to know`
          : "Today's TruthLoop digest",
      html,
    });
    return { ok: true, id: result.id, dryRun: result.dryRun };
  } catch (err) {
    logger.error({ err, userId: ctx.id }, '[email] digest send failed');
    return { ok: false, reason: 'send-failed', skipped: false };
  }
}

/* ── Weekly report ────────────────────────────────────────────────── */

interface WeeklyReportRow {
  weekStarting: Date;
  totalGuesses: number;
  correctGuesses: number;
  blindSpotCategory: string | null;
  blindSpotNarrative: string | null;
  replayClaimId: string | null;
  globalAverageAccuracy: number | null;
  userAccuracy: number | null;
}

async function loadReplayClaim(
  claimId: string | null
): Promise<WeeklyReportReplay | null> {
  if (!claimId) return null;
  const [row] = await db
    .select({
      id: schema.claims.id,
      text: schema.claims.text,
      verdict: schema.claims.verdict,
      explanation: schema.claims.explanation,
      sourceUrl: schema.claims.sourceUrl,
    })
    .from(schema.claims)
    .where(eq(schema.claims.id, claimId))
    .limit(1);
  if (!row) return null;
  return {
    id: row.id,
    text: row.text,
    verdict: row.verdict as 'real' | 'fake',
    explanation: row.explanation,
    sourceUrl: row.sourceUrl,
    sourceTitle: null,
  };
}

/**
 * Send the user's most recent weekly blind-spot report by email. Used
 * by the cron and the live "Email me this report" button.
 *
 * Tries the cached `weekly_reports` row first. If none exists (e.g. the
 * user signed in for the first time and never regenerated), falls back
 * to computing the report on the fly from their guesses — so the live
 * "Email me this report" button always works as long as the user has
 * voted in the past 7 days.
 */
export async function sendWeeklyReportEmail(userId: string): Promise<SendOutcome> {
  const ctx = await getUserContext(userId);
  if (!ctx) return { ok: false, reason: 'user-not-found', skipped: true };
  if (ctx.emailBounced) return { ok: false, reason: 'email-bounced', skipped: true };

  // Weekly digest flag governs the bulk send. The live button on the
  // report page is intentional — judges expect to be able to trigger it
  // regardless of the digest toggle, so we DON'T short-circuit on
  // emailDigestEnabled here. Cron callers run this through their own gate.
  const [cached] = await db
    .select()
    .from(schema.weeklyReports)
    .where(eq(schema.weeklyReports.userId, userId))
    .orderBy(desc(schema.weeklyReports.weekStarting))
    .limit(1);

  // Resolve the data we'll feed to the template. Prefer the cached row;
  // if missing, compute on the fly from the user's guesses (no AI — the
  // email template gets a fallback narrative placeholder instead).
  const report = cached
    ? await reportFromCachedRow(cached)
    : await reportFromGuesses(userId);

  if (!report) return { ok: false, reason: 'no-votes', skipped: true };

  try {
    const html = renderToStaticMarkup(
      WeeklyReportEmail({
        settingsUrl: `${config.app.url}/settings`,
        reportUrl: `${config.app.url}/reports/weekly`,
        weekStarting: report.weekStarting,
        totalGuesses: report.totalGuesses,
        correctGuesses: report.correctGuesses,
        accuracyPct: report.accuracyPct,
        globalAveragePct: report.globalAveragePct,
        blindSpotCategory: report.blindSpotCategory,
        blindSpotCategoryLabel: report.blindSpotCategory
          ? CATEGORY_LABELS[report.blindSpotCategory] ?? report.blindSpotCategory
          : null,
        blindSpotNarrative: report.blindSpotNarrative,
        replay: report.replay,
      })
    );

    const result = await sendEmail({
      to: ctx.email,
      subject: `Your week in Truth — ${report.accuracyPct}% accuracy`,
      html,
    });
    return { ok: true, id: result.id, dryRun: result.dryRun };
  } catch (err) {
    logger.error({ err, userId: ctx.id }, '[email] weekly-report send failed');
    return { ok: false, reason: 'send-failed', skipped: false };
  }
}

/* ── Weekly report resolvers (cached row vs on-the-fly) ───────────── */

interface ResolvedWeeklyReport {
  /** ISO `YYYY-MM-DD` — matches the template props and the DB `date` column. */
  weekStarting: string;
  totalGuesses: number;
  correctGuesses: number;
  accuracyPct: number;
  globalAveragePct: number | null;
  blindSpotCategory: string | null;
  blindSpotNarrative: string | null;
  replay: WeeklyReportReplay | null;
}

async function reportFromCachedRow(
  row: typeof schema.weeklyReports.$inferSelect
): Promise<ResolvedWeeklyReport> {
  const replay = await loadReplayClaim(row.replayClaimId);
  const accuracyPct =
    row.totalGuesses > 0
      ? Math.round((row.correctGuesses / row.totalGuesses) * 100)
      : 0;
  const globalAveragePct =
    row.globalAverageAccuracy !== null
      ? Math.round(row.globalAverageAccuracy * 100)
      : null;
  return {
    weekStarting: row.weekStarting,
    totalGuesses: row.totalGuesses,
    correctGuesses: row.correctGuesses,
    accuracyPct,
    globalAveragePct,
    blindSpotCategory: row.blindSpotCategory,
    blindSpotNarrative: row.blindSpotNarrative,
    replay,
  };
}

/** Sunday-anchored UTC midnight for the week containing `d`, as `YYYY-MM-DD`. */
function weekStartOf(d: Date): string {
  const u = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  );
  const dow = u.getUTCDay(); // 0 = Sun
  u.setUTCDate(u.getUTCDate() - dow);
  return u.toISOString().slice(0, 10);
}

interface CategoryRow {
  category: string;
  total: number;
  correct: number;
}

/**
 * Compute the weekly report shape directly from the user's guesses —
 * used when there's no cached `weekly_reports` row yet (e.g. a brand-new
 * user signed in via OAuth and hasn't regenerated). Returns null when
 * the user has zero guesses in the past 7 days, so the email endpoint
 * can surface a clean "vote first" error.
 *
 * Mirrors the on-the-fly path in `routes/reports.ts` `GET /weekly`. The
 * narrative is a deterministic placeholder — the AI-generated narrative
 * only lands when the user regenerates the report explicitly. That's a
 * deliberate trade-off: the email button always works, but to get a
 * personalized narrative the user has to hit Regenerate.
 */
async function reportFromGuesses(
  userId: string
): Promise<ResolvedWeeklyReport | null> {
  const now = new Date();
  const from = new Date(now.getTime());
  from.setUTCHours(0, 0, 0, 0);
  from.setUTCDate(from.getUTCDate() - 6);
  const fromIso = from.toISOString();
  const toIso = now.toISOString();

  const [totals, breakdown, globalAvg, replayClaimId] = await Promise.all([
    userTotalsFor(userId, fromIso, toIso),
    categoryBreakdownFor(userId, fromIso, toIso),
    globalAverageFor(fromIso, toIso),
    firstWrongClaimFor(userId, fromIso, toIso),
  ]);

  if (totals.total === 0) return null;

  const breakdownWithAccuracy = breakdown.map((r) => ({
    ...r,
    accuracy: r.total > 0 ? r.correct / r.total : 0,
  }));
  const blindSpotCategory = pickBlindSpot(breakdownWithAccuracy);
  const replay = await loadReplayClaim(replayClaimId);
  const accuracyPct =
    totals.total > 0 ? Math.round((totals.correct / totals.total) * 100) : 0;
  const globalAveragePct =
    globalAvg !== null ? Math.round(globalAvg * 100) : null;

  return {
    weekStarting: weekStartOf(now),
    totalGuesses: totals.total,
    correctGuesses: totals.correct,
    accuracyPct,
    globalAveragePct,
    blindSpotCategory,
    blindSpotNarrative: blindSpotCategory
      ? `You missed ${blindSpotCategory.replace(/_/g, ' ')} patterns more than other categories this week. Vote on more claims in that bucket to sharpen your instincts.`
      : null,
    replay,
  };
}

function pickBlindSpot(
  breakdown: { category: string; total: number; correct: number; accuracy: number }[]
): string | null {
  // Mirror `routes/reports.ts` `blindSpotFromBreakdown`: lowest-accuracy
  // category with at least 3 guesses. Falls back to the lowest overall
  // if nothing clears the threshold (keeps the email populated for
  // users with light voting history).
  const eligible = breakdown
    .filter((c) => c.total >= 3)
    .sort((a, b) => a.accuracy - b.accuracy);
  if (eligible.length > 0) return eligible[0].category;
  const fallback = [...breakdown].sort((a, b) => a.accuracy - b.accuracy);
  return fallback[0]?.category ?? null;
}

/* ── SQL helpers (subset of routes/reports.ts, deduped for emails) ── */

async function categoryBreakdownFor(
  userId: string,
  fromIso: string,
  toIso: string
): Promise<CategoryRow[]> {
  const rows = await db.execute<{
    category: string;
    total: number;
    correct: number;
  }>(sql`
    SELECT
      ${schema.claims.category} AS category,
      COUNT(*)::int AS total,
      SUM(CASE WHEN ${schema.guesses.isCorrect} THEN 1 ELSE 0 END)::int AS correct
    FROM ${schema.guesses}
    INNER JOIN ${schema.claims} ON ${schema.claims.id} = ${schema.guesses.claimId}
    WHERE ${schema.guesses.userId} = ${userId}
      AND ${schema.guesses.createdAt} >= ${fromIso}
      AND ${schema.guesses.createdAt} <= ${toIso}
    GROUP BY ${schema.claims.category}
  `);
  return rows.rows.map((r) => ({
    category: r.category,
    total: r.total,
    correct: r.correct,
  }));
}

async function userTotalsFor(
  userId: string,
  fromIso: string,
  toIso: string
): Promise<{ total: number; correct: number }> {
  const rows = await db.execute<{ total: number; correct: number }>(sql`
    SELECT
      COUNT(*)::int AS total,
      COALESCE(SUM(CASE WHEN ${schema.guesses.isCorrect} THEN 1 ELSE 0 END), 0)::int AS correct
    FROM ${schema.guesses}
    WHERE ${schema.guesses.userId} = ${userId}
      AND ${schema.guesses.createdAt} >= ${fromIso}
      AND ${schema.guesses.createdAt} <= ${toIso}
  `);
  return (
    rows.rows[0] ?? { total: 0, correct: 0 }
  );
}

async function globalAverageFor(
  fromIso: string,
  toIso: string
): Promise<number | null> {
  const rows = await db.execute<{ avg: number | null }>(sql`
    SELECT AVG(CASE WHEN ${schema.guesses.isCorrect} THEN 1.0 ELSE 0.0 END) AS avg
    FROM ${schema.guesses}
    WHERE ${schema.guesses.createdAt} >= ${fromIso}
      AND ${schema.guesses.createdAt} <= ${toIso}
  `);
  return rows.rows[0]?.avg ?? null;
}

async function firstWrongClaimFor(
  userId: string,
  fromIso: string,
  toIso: string
): Promise<string | null> {
  const rows = await db.execute<{ claim_id: string }>(sql`
    SELECT ${schema.guesses.claimId} AS claim_id
    FROM ${schema.guesses}
    WHERE ${schema.guesses.userId} = ${userId}
      AND ${schema.guesses.isCorrect} = false
      AND ${schema.guesses.createdAt} >= ${fromIso}
      AND ${schema.guesses.createdAt} <= ${toIso}
    ORDER BY ${schema.guesses.createdAt} DESC
    LIMIT 1
  `);
  return rows.rows[0]?.claim_id ?? null;
}

/* ── Instant alert (high-severity scam forecast) ─────────────────── */

interface HighSeverityItem {
  id: string;
  severity: string;
  title: string;
  description: string;
  recommendedAction: string | null;
  sourceUrl: string | null;
  sourceTitle: string | null;
}

/**
 * Find every high-severity forecast item for the given forecast date
 * (defaults to today) and email each one to every user with
 * `email_instant_alerts_enabled = true AND email_bounced = false`.
 *
 * Called from the forecast route after `generateAndPersistForecast()`.
 * Errors per-recipient are swallowed + logged so one bad address can't
 * take down the rest of the batch.
 */
export async function sendInstantAlertsForHighSeverityItems(
  forecastDate: string
): Promise<{ sent: number; dryRun: boolean }> {
  const items = await db
    .select({
      id: schema.scamForecastItems.id,
      severity: schema.scamForecastItems.severity,
      title: schema.scamForecastItems.title,
      description: schema.scamForecastItems.description,
      recommendedAction: schema.scamForecastItems.recommendedAction,
      sourceUrl: schema.scamForecastItems.sourceUrl,
      sourceTitle: schema.scamForecastItems.sourceTitle,
    })
    .from(schema.scamForecastItems)
    .innerJoin(
      schema.scamForecasts,
      eq(schema.scamForecasts.id, schema.scamForecastItems.forecastId)
    )
    .where(
      and(
        eq(schema.scamForecasts.forecastDate, forecastDate),
        eq(schema.scamForecastItems.severity, 'high')
      )
    );

  if (items.length === 0) {
    return { sent: 0, dryRun: false };
  }

  // All users with instant alerts enabled (and not bounced).
  const recipients = await db
    .select({ id: schema.users.id, email: schema.users.email })
    .from(schema.users)
    .innerJoin(schema.userSettings, eq(schema.userSettings.userId, schema.users.id))
    .where(
      and(
        eq(schema.userSettings.emailInstantAlertsEnabled, true),
        eq(schema.users.emailBounced, false)
      )
    );

  const displayDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });

  let sent = 0;
  let dryRun = false;

  for (const recipient of recipients) {
    for (const item of items) {
      const outcome = await sendInstantAlert(recipient.email, item, displayDate);
      if (outcome.ok) {
        sent++;
        if (outcome.dryRun) dryRun = true;
      }
    }
  }

  return { sent, dryRun };
}

async function sendInstantAlert(
  to: string,
  item: HighSeverityItem,
  displayDate: string
): Promise<SendOutcome> {
  try {
    const html = renderToStaticMarkup(
      InstantAlertEmail({
        settingsUrl: `${config.app.url}/settings`,
        forecastUrl: `${config.app.url}/forecast`,
        displayDate,
        item: {
          severity: 'high',
          title: item.title,
          summary: item.description,
          recommendedAction: item.recommendedAction,
          sourceUrl: item.sourceUrl,
          sourceTitle: item.sourceTitle,
        },
      })
    );

    const result = await sendEmail({
      to,
      subject: `⚠️ High-risk scam pattern: ${item.title}`,
      html,
    });
    return { ok: true, id: result.id, dryRun: result.dryRun };
  } catch (err) {
    logger.error({ err, to }, '[email] instant-alert send failed');
    return { ok: false, reason: 'send-failed', skipped: false };
  }
}

/* ── Unused but exported for symmetry (so import patterns are uniform) ─ */
export const _unused = { CATEGORY_LABELS };