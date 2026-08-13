/**
 * Reports routes — weekly blind-spot report.
 * Mounted at /api/reports
 *
 *   GET /weekly?kind=week|month|quarter|custom&from=YYYY-MM-DD&to=YYYY-MM-DD
 *     Returns a blind-spot report for the active range. `kind=week` with no
 *     explicit `from`/`to` reads the cached `weekly_reports` row (preserves
 *     demo-account behaviour). All other combinations compute on-the-fly
 *     from `guesses` + `claims`.
 *
 *   POST /weekly/regenerate
 *     Recomputes and overwrites the current week's `weekly_reports` row.
 *     Always week-only — 400 on any other range.
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { eq, sql, desc, and } from 'drizzle-orm';
import { db, schema } from '@/db';
import { AppError } from '@/middleware/errorHandler';
import {
  blindSpotNarrativeFallback,
  generateText,
  generateStructured,
  trendCoachNoteSchema,
  trendCoachNoteFallback,
  blindSpotContextSchema,
  blindSpotContextFallback,
  replayCoachNoteSchema,
  replayCoachNoteFallback,
  prescriptionSchema,
  prescriptionFallback,
} from '@/ai';
import type { TrendCoachNote, BlindSpotContext, ReplayCoachNote, Prescription } from '@/ai';
import {
  buildBlindSpotNarrativePrompt,
  normalizeBlindSpotNarrative,
} from '@/ai/prompts/blind-spot-narrative';
import {
  buildTrendCoachNotePrompt,
  normalizeTrendCoachNote,
} from '@/ai/prompts/trend-coach-note';
import {
  buildBlindSpotContextPrompt,
  normalizeBlindSpotContext,
} from '@/ai/prompts/blind-spot-context';
import {
  buildReplayCoachNotePrompt,
  normalizeReplayCoachNote,
} from '@/ai/prompts/replay-coach-note';
import {
  buildPrescriptionPrompt,
  normalizePrescription,
} from '@/ai/prompts/prescription';
import type { WeeklyCoachNotes } from '@/db/schema/reports';
import { categoryLabel } from '@/lib/category-label';

const router = Router();

/* ── Auth ─────────────────────────────────────────────────────────── */

function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    throw new AppError(401, 'You must be signed in.');
  }
  next();
}

/* ── Range parsing ─────────────────────────────────────────────────── */

const RANGE_KIND = ['week', 'month', 'quarter', 'custom'] as const;
type RangeKind = (typeof RANGE_KIND)[number];
type BucketKind = 'day' | 'week';

const rangeQuerySchema = z
  .object({
    kind: z.enum(RANGE_KIND).optional().default('week'),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  })
  .superRefine((q, ctx) => {
    if (q.kind === 'custom') {
      if (!q.from || !q.to) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'kind=custom requires both from and to',
        });
      } else if (q.to.getTime() < q.from.getTime()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'to must be >= from',
        });
      }
    }
    if (q.kind === 'week' && (q.from || q.to)) {
      // explicit week range = compute on the fly, fine; just no validation needed
    }
  });

interface ResolvedRange {
  kind: RangeKind;
  from: Date;
  to: Date;
  /** Display label, e.g. "Aug 10 — Aug 16, 2026". */
  label: string;
  /** How to bucket the trend: `day` for ≤ ~31-point windows, `week` for larger. */
  bucket: BucketKind;
  /** True if the weekly_reports cache could match this range. */
  cacheableAsWeek: boolean;
}

/** UTC midnight for the start of the Sunday-anchored week containing `d`. */
function weekStart(d: Date): Date {
  const u = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  );
  const dow = u.getUTCDay(); // 0 = Sun
  u.setUTCDate(u.getUTCDate() - dow);
  return u;
}

function monthStart(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)
  );
}

/** First day of the 3-month block containing `d` (Jan/Apr/Jul/Oct 1). */
function quarterStart(d: Date): Date {
  const qStartMonth = Math.floor(d.getUTCMonth() / 3) * 3;
  return new Date(Date.UTC(d.getUTCFullYear(), qStartMonth, 1));
}

function addDays(d: Date, n: number): Date {
  const u = new Date(d.getTime());
  u.setUTCDate(u.getUTCDate() + n);
  return u;
}

/** Sunday-anchored week containing `d`, returned as a UTC midnight date. */
function bucketWeek(d: Date): Date {
  return weekStart(d);
}

function clampToNow(d: Date): Date {
  const now = new Date();
  return d.getTime() > now.getTime() ? now : d;
}

function formatRangeLabel(from: Date, to: Date): string {
  const sameMonth =
    from.getUTCFullYear() === to.getUTCFullYear() &&
    from.getUTCMonth() === to.getUTCMonth();
  const fy = from.getUTCFullYear();
  const ty = to.getUTCFullYear();
  const fm = from.toLocaleDateString(undefined, { month: 'short', timeZone: 'UTC' });
  const tm = to.toLocaleDateString(undefined, { month: 'short', timeZone: 'UTC' });
  const fd = from.getUTCDate();
  const td = to.getUTCDate();
  if (sameMonth && fy === ty) return `${fm} ${fd} — ${td}, ${fy}`;
  if (fy === ty) return `${fm} ${fd} — ${tm} ${td}, ${fy}`;
  return `${fm} ${fd}, ${fy} — ${tm} ${td}, ${ty}`;
}

/** Resolve the raw query params into concrete dates + bucket strategy. */
function resolveRange(raw: z.infer<typeof rangeQuerySchema>): ResolvedRange {
  const now = new Date();

  let from: Date;
  let to: Date;

  if (raw.kind === 'custom' && raw.from && raw.to) {
    from = new Date(Date.UTC(raw.from.getUTCFullYear(), raw.from.getUTCMonth(), raw.from.getUTCDate()));
    to = new Date(Date.UTC(raw.to.getUTCFullYear(), raw.to.getUTCMonth(), raw.to.getUTCDate(), 23, 59, 59, 999));
    to = clampToNow(to);
  } else if (raw.kind === 'week') {
    if (raw.from && raw.to) {
      from = new Date(Date.UTC(raw.from.getUTCFullYear(), raw.from.getUTCMonth(), raw.from.getUTCDate()));
      to = new Date(Date.UTC(raw.to.getUTCFullYear(), raw.to.getUTCMonth(), raw.to.getUTCDate(), 23, 59, 59, 999));
      to = clampToNow(to);
    } else {
      // Last 7 days.
      to = clampToNow(now);
      from = addDays(to, -6);
      from = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
    }
  } else if (raw.kind === 'month') {
    from = monthStart(now);
    to = clampToNow(now);
  } else {
    // quarter
    from = quarterStart(now);
    to = clampToNow(now);
  }

  const days = Math.max(
    1,
    Math.round((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000))
  );

  // Bucketing: stay daily for ≤ 31 days, weekly beyond that (quarter = 13 weekly points).
  const bucket: BucketKind = days <= 31 ? 'day' : 'week';

  const cacheableAsWeek =
    raw.kind === 'week' && !raw.from && !raw.to;

  return {
    kind: raw.kind,
    from,
    to,
    label: formatRangeLabel(from, to),
    bucket,
    cacheableAsWeek,
  };
}

/* ── SQL helpers ───────────────────────────────────────────────────── */

interface CategoryRow {
  category: string;
  total: number;
  correct: number;
}

async function categoryBreakdownFor(
  userId: string,
  fromIso: string,
  toIso: string
): Promise<CategoryRow[]> {
  const rows = await db.execute<CategoryRow>(sql`
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
  return rows.rows;
}

interface TrendRow {
  bucket: string;
  total: number;
  correct: number;
}

async function trendRowsFor(
  userId: string,
  fromIso: string,
  toIso: string,
  bucket: BucketKind
): Promise<TrendRow[]> {
  const trunc = bucket === 'week'
    ? sql.raw(`date_trunc('week', ${schema.guesses.createdAt.name})::date`)
    : sql.raw(`date_trunc('day', ${schema.guesses.createdAt.name})::date`);
  const rows = await db.execute<TrendRow>(sql`
    SELECT
      ${trunc} AS bucket,
      COUNT(*)::int AS total,
      SUM(CASE WHEN ${schema.guesses.isCorrect} THEN 1 ELSE 0 END)::int AS correct
    FROM ${schema.guesses}
    WHERE ${schema.guesses.userId} = ${userId}
      AND ${schema.guesses.createdAt} >= ${fromIso}
      AND ${schema.guesses.createdAt} <= ${toIso}
    GROUP BY bucket
    ORDER BY bucket ASC
  `);
  return rows.rows;
}

interface UserTotalsRow {
  total: number;
  correct: number;
}

async function userTotalsFor(
  userId: string,
  fromIso: string,
  toIso: string
): Promise<UserTotalsRow> {
  // COALESCE: SUM over an empty set returns NULL in SQL, which then becomes
  // null in JS and fails the NOT NULL constraint on weekly_reports.correct_guesses
  // when this user has zero guesses in the window. Without the wrap, the INSERT
  // in `/weekly/regenerate` 500s on the very first regen for a brand-new user.
  const rows = await db.execute<UserTotalsRow>(sql`
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

interface GlobalAvgRow {
  avg: number | null;
}

async function globalAverageFor(
  fromIso: string,
  toIso: string
): Promise<number | null> {
  const rows = await db.execute<GlobalAvgRow>(sql`
    SELECT AVG(CASE WHEN ${schema.guesses.isCorrect} THEN 1.0 ELSE 0.0 END) AS avg
    FROM ${schema.guesses}
    WHERE ${schema.guesses.createdAt} >= ${fromIso}
      AND ${schema.guesses.createdAt} <= ${toIso}
  `);
  return rows.rows[0]?.avg ?? null;
}

interface ReplayRow {
  claim_id: string;
}

async function firstWrongClaimFor(
  userId: string,
  fromIso: string,
  toIso: string
): Promise<string | null> {
  const rows = await db.execute<ReplayRow>(sql`
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

function blindSpotFromBreakdown(
  breakdown: { category: string; total: number; correct: number; accuracy: number }[]
): string | null {
  const ranked = breakdown
    .filter((c) => c.total >= 3)
    .sort((a, b) => a.accuracy - b.accuracy);
  return ranked[0]?.category ?? null;
}

function blankNarrative(): null {
  // On-the-fly computation paths don't get an AI-generated narrative — they'd
  // need a structured call. The cached weekly row's narrative is set by the
  // regenerate endpoint (via Claude); custom/month/quarter ranges reuse the
  // public fallback so the section never looks broken.
  return null;
}

/** Pad the in-bucket rows with zero-rows for every missing bucket in the window. */
function bucketizeTrend(
  rows: TrendRow[],
  range: ResolvedRange
): { day: string; total: number; correct: number; accuracy: number; bucket: BucketKind }[] {
  const filledMap = new Map<string, { total: number; correct: number }>();
  for (const r of rows) {
    const isoDay = r.bucket instanceof Date
      ? r.bucket.toISOString().slice(0, 10)
      : String(r.bucket);
    filledMap.set(isoDay, { total: r.total, correct: r.correct });
  }

  const out: { day: string; total: number; correct: number; accuracy: number; bucket: BucketKind }[] = [];

  if (range.bucket === 'day') {
    for (
      let d = new Date(range.from.getTime());
      d.getTime() <= range.to.getTime();
      d = addDays(d, 1)
    ) {
      const iso = d.toISOString().slice(0, 10);
      const entry = filledMap.get(iso) ?? { total: 0, correct: 0 };
      out.push({
        day: iso,
        total: entry.total,
        correct: entry.correct,
        accuracy: entry.total > 0 ? entry.correct / entry.total : 0,
        bucket: 'day',
      });
    }
  } else {
    // weekly buckets — emit Sunday-anchored entries, zero-filling empty weeks
    let cursor = bucketWeek(range.from);
    while (cursor.getTime() <= range.to.getTime()) {
      const iso = cursor.toISOString().slice(0, 10);
      const entry = filledMap.get(iso) ?? { total: 0, correct: 0 };
      out.push({
        day: iso,
        total: entry.total,
        correct: entry.correct,
        accuracy: entry.total > 0 ? entry.correct / entry.total : 0,
        bucket: 'week',
      });
      cursor = addDays(cursor, 7);
    }
  }

  return out;
}

/* ── Replay lookup ─────────────────────────────────────────────────── */

interface ReplayClaim {
  id: string;
  text: string;
  category: string;
  verdict: 'real' | 'fake';
  explanation: string | null;
  sourceUrl: string | null;
}

async function loadReplay(claimId: string | null): Promise<ReplayClaim | null> {
  if (!claimId) return null;
  const [claim] = await db
    .select({
      id: schema.claims.id,
      text: schema.claims.text,
      category: schema.claims.category,
      verdict: schema.claims.verdict,
      explanation: schema.claims.explanation,
      sourceUrl: schema.claims.sourceUrl,
    })
    .from(schema.claims)
    .where(eq(schema.claims.id, claimId))
    .limit(1);
  return claim ?? null;
}

/* ── Compose the report shape ──────────────────────────────────────── */

interface WeeklyReportPayload {
  weekStarting: string;
  totalGuesses: number;
  correctGuesses: number;
  blindSpotCategory: string | null;
  blindSpotNarrative: string | null;
  globalAverageAccuracy: number | null;
  userAccuracy: number | null;
  createdAt: string;
  replayClaim: ReplayClaim | null;
  categoryBreakdown: { category: string; total: number; correct: number; accuracy: number }[];
  trend: { day: string; total: number; correct: number; accuracy: number; bucket: BucketKind }[];
  /** Per-section inline coach notes + closing prescription. `null` for
   *  non-week ranges (v1: regenerate is week-only anyway). */
  coachNotes: WeeklyCoachNotes | null;
}

/** `Promise.allSettled` helper: pick the fulfilled value or substitute `fallback`.
 *  Each coach-note generator already returns its own fallback via
 *  `generateStructured`, so this never has to substitute anything in practice —
 *  it's here as a belt-and-braces safety net. */
function pickOk<T>(r: PromiseSettledResult<T>, fallback: T): T {
  return r.status === 'fulfilled' ? r.value : fallback;
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/* ── GET /weekly ───────────────────────────────────────────────────── */

router.get('/weekly', requireAuth, async (req, res) => {
  const raw = rangeQuerySchema.parse(req.query);
  const range = resolveRange(raw);
  const userId = (req.user as { id: string }).id;
  const fromIso = range.from.toISOString();
  const toIso = range.to.toISOString();

  // 1) Prefer the cached weekly_reports row when the range is exactly the
  //    most-recent past-7-days window. Lets the demo account surface its
  //    seeded narrative without us fabricating one.
  if (range.cacheableAsWeek) {
    const [cached] = await db
      .select()
      .from(schema.weeklyReports)
      .where(eq(schema.weeklyReports.userId, userId))
      .orderBy(desc(schema.weeklyReports.weekStarting))
      .limit(1);

    if (cached) {
      const [breakdown, totals, globalAvg, replayId, trendRows] = await Promise.all([
        categoryBreakdownFor(userId, fromIso, toIso),
        userTotalsFor(userId, fromIso, toIso),
        globalAverageFor(fromIso, toIso),
        cached.replayClaimId ? Promise.resolve(cached.replayClaimId) : firstWrongClaimFor(userId, fromIso, toIso),
        trendRowsFor(userId, fromIso, toIso, range.bucket),
      ]);

      const replay = await loadReplay(replayId);
      const blindSpotCategory =
        cached.blindSpotCategory ?? blindSpotFromBreakdown(breakdown);
      const userAccuracy =
        totals.total > 0 ? totals.correct / totals.total : 0;

      const payload: WeeklyReportPayload = {
        weekStarting: toIsoDate(range.from),
        totalGuesses: totals.total,
        correctGuesses: totals.correct,
        blindSpotCategory,
        blindSpotNarrative: cached.blindSpotNarrative ?? blankNarrative(),
        globalAverageAccuracy: globalAvg,
        userAccuracy,
        createdAt: cached.createdAt.toISOString(),
        replayClaim: replay,
        categoryBreakdown: breakdown.map((r) => ({
          ...r,
          accuracy: r.total > 0 ? r.correct / r.total : 0,
        })),
        trend: bucketizeTrend(trendRows, range),
        coachNotes: cached.coachNotes ?? null,
      };

      res.json({
        report: payload,
        range: {
          kind: range.kind,
          from: toIsoDate(range.from),
          to: toIsoDate(range.to),
          label: range.label,
          bucket: range.bucket,
        },
      });
      return;
    }
  }

  // 2) On-the-fly computation for everything else.
  const [breakdown, totals, globalAvg, replayId, trendRows] = await Promise.all([
    categoryBreakdownFor(userId, fromIso, toIso),
    userTotalsFor(userId, fromIso, toIso),
    globalAverageFor(fromIso, toIso),
    firstWrongClaimFor(userId, fromIso, toIso),
    trendRowsFor(userId, fromIso, toIso, range.bucket),
  ]);

  const replay = await loadReplay(replayId);
  const blindSpotCategory = blindSpotFromBreakdown(breakdown);
  const userAccuracy =
    totals.total > 0 ? totals.correct / totals.total : 0;

  const payload: WeeklyReportPayload = {
    weekStarting: toIsoDate(range.from),
    totalGuesses: totals.total,
    correctGuesses: totals.correct,
    blindSpotCategory,
    blindSpotNarrative: blindSpotCategory ? blankNarrative() : null,
    globalAverageAccuracy: globalAvg,
    userAccuracy,
    createdAt: new Date().toISOString(),
    replayClaim: replay,
    categoryBreakdown: breakdown.map((r) => ({
      ...r,
      accuracy: r.total > 0 ? r.correct / r.total : 0,
    })),
    trend: bucketizeTrend(trendRows, range),
    // Non-week ranges don't get cached coach notes (regenerate is week-only).
    // v1: leave as null; future ticket can compute live.
    coachNotes: null,
  };

  res.json({
    report: payload,
    range: {
      kind: range.kind,
      from: toIsoDate(range.from),
      to: toIsoDate(range.to),
      label: range.label,
      bucket: range.bucket,
    },
  });
});

/* ── POST /weekly/regenerate (week-only) ───────────────────────────── */

const regenerateBodySchema = z.object({
  kind: z.enum(RANGE_KIND).optional().default('week'),
});

router.post('/weekly/regenerate', requireAuth, async (req, res) => {
  const userId = (req.user as { id: string }).id;
  const { kind } = regenerateBodySchema.parse(req.body ?? {});

  if (kind !== 'week') {
    throw new AppError(
      400,
      `Regenerate is only available for week. Received: ${kind}.`
    );
  }

  const weekStarting = weekStart(new Date());

  // Past-7-day window for this user.
  const now = new Date();
  const from = addDays(now, -6);
  from.setUTCHours(0, 0, 0, 0);
  const fromIso = from.toISOString();
  const toIso = now.toISOString();
  const periodLabel = 'the last 7 days';

  const breakdown = await categoryBreakdownFor(userId, fromIso, toIso);
  const totals = await userTotalsFor(userId, fromIso, toIso);
  const totalGuesses = totals.total;
  const correctGuesses = totals.correct;
  const userAccuracy =
    totalGuesses > 0 ? correctGuesses / totalGuesses : 0;

  const breakdownWithAccuracy = breakdown.map((r) => ({
    ...r,
    accuracy: r.total > 0 ? r.correct / r.total : 0,
  }));
  const blindSpotCategory = blindSpotFromBreakdown(breakdownWithAccuracy);
  const replayClaimId = await firstWrongClaimFor(userId, fromIso, toIso);
  const replay = await loadReplay(replayClaimId);
  const trendRows = await trendRowsFor(userId, fromIso, toIso, 'day');
  const globalAverageAccuracy = await globalAverageFor(fromIso, toIso);

  // ── Generate the narrative + four Coach Notes in parallel.
  // Each note has its own typed Zod schema + fallback constant, so a single
  // bad call never blocks the rest. `Promise.allSettled` lets us collect
  // every result (or its reason) without short-circuiting.
  const blindSpotRow = blindSpotCategory
    ? breakdownWithAccuracy.find((r) => r.category === blindSpotCategory)
    : undefined;

  // Per the conversation re MiniMax-M2's extended-thinking block, every
  // text call is budgeted at 1024 tokens so the model has room to think
  // AND emit its answer (otherwise it hits stop_reason=max_tokens with
  // zero text blocks). `generateStructured` returns the fallback on parse
  // failures, so 1024 caps never throw — they just risk truncated output.
  const narrativePromise = blindSpotRow
    ? generateText({
        ...buildBlindSpotNarrativePrompt({
          categoryLabel: categoryLabel(blindSpotCategory!),
          userMissRate: 1 - blindSpotRow.accuracy,
          globalMissRate:
            globalAverageAccuracy !== null ? 1 - globalAverageAccuracy : 0.5,
          voteCount: blindSpotRow.total,
          periodLabel,
        }),
        maxTokens: 1024,
      }).catch((err: unknown) => {
        console.warn('[reports] narrative generation failed, using fallback.', err);
        return blindSpotNarrativeFallback.narrative;
      })
    : Promise.resolve<string | null>(null);

  const trendNotePromise = generateStructured<TrendCoachNote>({
    ...buildTrendCoachNotePrompt({
      userAccuracy,
      globalAverageAccuracy,
      trendPoints: trendRows.map((p) => ({
        day: p.day,
        total: p.total,
        correct: p.correct,
        accuracy: p.total > 0 ? p.correct / p.total : 0,
      })),
      periodLabel,
    }),
    schema: trendCoachNoteSchema,
    fallback: trendCoachNoteFallback,
    coerce: 'string-field',
    maxTokens: 1024,
  });

  const blindSpotNotePromise = blindSpotRow
    ? generateStructured<BlindSpotContext>({
        ...buildBlindSpotContextPrompt({
          categoryLabel: categoryLabel(blindSpotCategory!),
          userMissRate: 1 - blindSpotRow.accuracy,
          globalMissRate:
            globalAverageAccuracy !== null ? 1 - globalAverageAccuracy : 0.5,
          voteCount: blindSpotRow.total,
          periodLabel,
        }),
        schema: blindSpotContextSchema,
        fallback: blindSpotContextFallback,
        coerce: 'string-field',
        maxTokens: 1024,
      })
    : Promise.resolve(blindSpotContextFallback);

  const replayNotePromise = replay
    ? generateStructured<ReplayCoachNote>({
        ...buildReplayCoachNotePrompt({
          claimText: replay.text,
          categoryLabel: categoryLabel(replay.category),
          verdict: replay.verdict,
          explanation: replay.explanation,
          periodLabel,
        }),
        schema: replayCoachNoteSchema,
        fallback: replayCoachNoteFallback,
        coerce: 'string-field',
        maxTokens: 1024,
      })
    : Promise.resolve(replayCoachNoteFallback);

  // Prescription sees the most context — it has to wait for the breakdown,
  // but doesn't need to wait for the other AI calls. We pass stable inputs
  // straight from the SQL helpers + the freshly-computed narrative (which
  // we resolve via Promise.allSettled below if we want to chain it; for v1
  // we let the prescription fire on the deterministic inputs so its
  // prompt budget is independent of the narrative latency).
  const prescriptionPromise = generateStructured<Prescription>({
    ...buildPrescriptionPrompt({
      blindSpotCategoryLabel: blindSpotCategory ? categoryLabel(blindSpotCategory) : null,
      blindSpotNarrative: null, // chain not needed in v1
      categoryBreakdown: breakdownWithAccuracy,
      periodLabel,
    }),
    schema: prescriptionSchema,
    fallback: prescriptionFallback,
    coerce: 'string-field',
    maxTokens: 1024,
  });

  const [
    narrativeRaw,
    trendResult,
    blindSpotNoteResult,
    replayNoteResult,
    prescriptionResult,
  ] = await Promise.allSettled([
    narrativePromise,
    trendNotePromise,
    blindSpotNotePromise,
    replayNotePromise,
    prescriptionPromise,
  ]);

  // ── Resolve narrative with light validation (must mention "you" / ≥ 12 chars).
  let narrative: string | null = null;
  if (narrativeRaw.status === 'fulfilled' && narrativeRaw.value) {
    const normalized = normalizeBlindSpotNarrative(narrativeRaw.value);
    const candidate = normalized.narrative;
    narrative =
      candidate && candidate.length >= 12 && /\byou\b/i.test(candidate)
        ? candidate
        : blindSpotNarrativeFallback.narrative;
  }

  // ── Resolve coach notes from structured results. Each generator returns
  // its own fallback on parse failure, so we just unwrap the PromiseSettled.
  const trendNote: TrendCoachNote = pickOk(trendResult, trendCoachNoteFallback);
  const blindSpotNote: BlindSpotContext = pickOk(
    blindSpotNoteResult,
    blindSpotContextFallback
  );
  const replayNote: ReplayCoachNote = pickOk(replayNoteResult, replayCoachNoteFallback);
  const prescription: Prescription = pickOk(prescriptionResult, prescriptionFallback);

  // Light validation: must mention "you" and ≥ 12 chars (matches the narrative rule).
  // If a note is too short or doesn't address the user, swap in the fallback silently.
  const looksRight = (note: string) =>
    note.length >= 12 && /\byou\b/i.test(note);

  const coachNotes: WeeklyCoachNotes = {
    trend: looksRight(trendNote.note) ? trendNote.note : trendCoachNoteFallback.note,
    blindSpot: looksRight(blindSpotNote.note)
      ? blindSpotNote.note
      : blindSpotContextFallback.note,
    replay: looksRight(replayNote.note) ? replayNote.note : replayCoachNoteFallback.note,
    prescription: looksRight(prescription.note)
      ? prescription.note
      : prescriptionFallback.note,
  };

  const existing = await db
    .select({ id: schema.weeklyReports.id })
    .from(schema.weeklyReports)
    .where(
      and(
        eq(schema.weeklyReports.userId, userId),
        eq(schema.weeklyReports.weekStarting, toIsoDate(weekStarting))
      )
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(schema.weeklyReports)
      .set({
        totalGuesses,
        correctGuesses,
        blindSpotCategory,
        blindSpotNarrative: narrative,
        replayClaimId,
        globalAverageAccuracy,
        userAccuracy,
        coachNotes,
      })
      .where(eq(schema.weeklyReports.id, existing[0].id));
  } else {
    await db.insert(schema.weeklyReports).values({
      userId,
      weekStarting: toIsoDate(weekStarting),
      totalGuesses,
      correctGuesses,
      blindSpotCategory,
      blindSpotNarrative: narrative,
      replayClaimId,
      globalAverageAccuracy,
      userAccuracy,
      coachNotes,
    });
  }

  res.json({
    ok: true,
    kind,
    weekStarting: toIsoDate(weekStarting),
    totalGuesses,
    correctGuesses,
    blindSpotCategory,
    coachNotes,
  });
});

export default router;
