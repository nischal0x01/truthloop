/**
 * Forecast routes — daily AI Scam Forecast (`.ai/02-business-logic.md` §3).
 * Mounted at /api/forecast
 *
 *   GET    /api/forecast/today            → today's forecast + items + the caller's votes.
 *                                          Auto-generates on-demand if today's forecast is missing
 *                                          (matches the §3.5 fallback rule for a missed cron).
 *   GET    /api/forecast/history?days=3   → the last N days, newest first (default 3, max 7).
 *   POST   /api/forecast/generate         → manual trigger: re-generates today's forecast and
 *                                          overwrites the existing row's items. Useful for the
 *                                          demo script and for re-running after a bad Claude call.
 *   POST   /api/forecast/:itemId/vote     → { vote: 'believe' | 'doubt' | 'skip' }. One vote
 *                                          per user per item (overwrites); vote counts are
 *                                          RECOMPUTED from `forecast_votes` so a double-click
 *                                          can't drift the tally.
 *
 * Generation pipeline:
 *   1. Build the prompt with today's date (UTC) + recent headlines + recent patterns.
 *      For the 48-hour hackathon we don't have RSS yet — pass empty arrays and rely on
 *      the model's training knowledge. `generateStructured` returns the typed fallback
 *      if Claude is down or returns unparseable JSON.
 *   2. Map the AI's `summary`/`pattern` → DB `description`/`recommendedAction`.
 *   3. Severity 'critical' (AI) → 'high' (DB enum). The enum is locked to 3 buckets
 *      and changing it would touch the migration; the AI can still surface a "critical"
 *      sentiment by using 'high' + a strong summary.
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { desc, eq, gte, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/db';
import { AppError } from '@/middleware/errorHandler';
import {
  buildScamForecastPrompt,
  forecastFallback,
  forecastListSchema,
  generateStructured,
} from '@/ai';
import type { ForecastList } from '@/ai';

/* ── Setup ──────────────────────────────────────────────────────────── */

const router = Router();

function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    throw new AppError(401, 'You must be signed in.');
  }
  next();
}

/** UTC midnight for "today" — matches the spec's 06:00 UTC cron anchor. */
function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

/* ── Response shape ────────────────────────────────────────────────── */

/**
 * The single normalized shape the frontend renders. We always return this so
 * the page doesn't have to branch on "is this seeded data or AI output?"
 */
export interface ForecastItemOut {
  id: string;
  severity: 'low' | 'medium' | 'high';
  category: string;
  title: string;
  summary: string;
  recommendedAction: string | null;
  region: string | null;
  believeCount: number;
  doubtCount: number;
  skipCount: number;
  myVote: 'believe' | 'doubt' | 'skip' | null;
  /** ISO timestamp the item was created. */
  createdAt: string;
}

export interface ForecastOut {
  id: string;
  date: string;
  generatedAt: string;
  generationStatus: 'success' | 'fallback' | 'failed';
  items: ForecastItemOut[];
}

type SeverityDb = 'low' | 'medium' | 'high';

/** DB enum only supports 3 buckets; collapse the AI's "critical" to "high". */
function normalizeSeverity(raw: string): SeverityDb {
  if (raw === 'critical') return 'high';
  if (raw === 'low' || raw === 'medium' || raw === 'high') return raw;
  return 'medium';
}

/* ── Query helpers ─────────────────────────────────────────────────── */

/**
 * Fetch a forecast + its items + the caller's vote for each item.
 * Returns null when no forecast row exists for the date.
 */
async function fetchForecastForDate(
  date: string,
  userId: string | null
): Promise<ForecastOut | null> {
  const [forecast] = await db
    .select()
    .from(schema.scamForecasts)
    .where(eq(schema.scamForecasts.forecastDate, date))
    .limit(1);
  if (!forecast) return null;

  const itemRows = await db
    .select({
      id: schema.scamForecastItems.id,
      severity: schema.scamForecastItems.severity,
      category: schema.scamForecastItems.category,
      title: schema.scamForecastItems.title,
      description: schema.scamForecastItems.description,
      recommendedAction: schema.scamForecastItems.recommendedAction,
      believeCount: schema.scamForecastItems.believeCount,
      doubtCount: schema.scamForecastItems.doubtCount,
      skipCount: schema.scamForecastItems.skipCount,
      createdAt: schema.scamForecastItems.createdAt,
      myVote: userId
        ? sql<'believe' | 'doubt' | 'skip' | null>`(
            SELECT fv.vote FROM forecast_votes fv
             WHERE fv.forecast_item_id = ${schema.scamForecastItems.id}
               AND fv.user_id = ${userId}
          )`.as('my_vote')
        : sql<null>`NULL`.as('my_vote'),
    })
    .from(schema.scamForecastItems)
    .where(eq(schema.scamForecastItems.forecastId, forecast.id))
    .orderBy(
      // High → Medium → Low so the page can render in priority order without sorting in JS.
      sql`CASE ${schema.scamForecastItems.severity}
            WHEN 'high' THEN 0
            WHEN 'medium' THEN 1
            WHEN 'low' THEN 2
            ELSE 3 END`,
      schema.scamForecastItems.createdAt
    );

  return {
    id: forecast.id,
    date: forecast.forecastDate,
    generatedAt: forecast.generatedAt.toISOString(),
    generationStatus: forecast.generationStatus,
    items: itemRows.map((r) => ({
      id: r.id,
      severity: r.severity as SeverityDb,
      category: r.category,
      title: r.title,
      summary: r.description,
      recommendedAction: r.recommendedAction,
      region: null,
      believeCount: r.believeCount,
      doubtCount: r.doubtCount,
      skipCount: r.skipCount,
      myVote: (r.myVote ?? null) as 'believe' | 'doubt' | 'skip' | null,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}

/**
 * Generate today's forecast via Claude. Persists the new row + items. Returns
 * the freshly-persisted ForecastOut. If Claude is down / returns garbage we
 * fall through to `forecastFallback` (already a typed `ForecastList`).
 */
async function generateAndPersistForecast(date: string): Promise<ForecastOut> {
  const { system, prompt, userInput } = buildScamForecastPrompt({
    today: date,
    recentHeadlines: [],
    recentScamPatterns: [],
    region: 'GLOBAL',
  });

  // generateStructured never throws on parse failure (returns fallback), so the
  // status flag below is the only way we know we used the typed default.
  const aiResult = await generateStructured<ForecastList>({
    system,
    prompt,
    userInput,
    schema: forecastListSchema,
    fallback: forecastFallback,
  });

  // Mark as fallback when the model's output matches the typed default — a cheap
  // reference check on the array contents. `forecastFallback` is a module-level
  // const so identity comparison is safe; deep-compare as belt-and-braces.
  const usedFallback =
    aiResult === forecastFallback ||
    (aiResult.items.length === forecastFallback.items.length &&
      aiResult.items.every((it, i) => it.title === forecastFallback.items[i]?.title));

  // 1. Upsert the forecast row (date is unique; one per day).
  const [forecast] = await db
    .insert(schema.scamForecasts)
    .values({
      forecastDate: date,
      generationStatus: usedFallback ? 'fallback' : 'success',
    })
    .onConflictDoUpdate({
      target: schema.scamForecasts.forecastDate,
      set: {
        generatedAt: sql`NOW()`,
        generationStatus: usedFallback ? 'fallback' : 'success',
      },
    })
    .returning();

  // 2. Wipe + re-insert items for this forecast. Simpler than diffing and
  //    matches "re-generate replaces" semantics (matches the demo flow).
  await db
    .delete(schema.scamForecastItems)
    .where(eq(schema.scamForecastItems.forecastId, forecast.id));

  if (aiResult.items.length > 0) {
    await db.insert(schema.scamForecastItems).values(
      aiResult.items.map((it) => ({
        forecastId: forecast.id,
        severity: normalizeSeverity(it.severity),
        category: it.category,
        title: it.title,
        description: it.summary,
        recommendedAction: it.pattern,
      }))
    );
  }

  return (await fetchForecastForDate(date, null))!;
}

/* ── Schemas ───────────────────────────────────────────────────────── */

const voteSchema = z.object({
  vote: z.enum(['believe', 'doubt', 'skip']),
});

const historyQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(7).optional().default(3),
});

/* ── GET /api/forecast/today ─────────────────────────────────────────── */

router.get('/today', async (req, res) => {
  const userId = req.isAuthenticated() ? (req.user as { id: string }).id : null;
  const date = todayUtc();

  let forecast = await fetchForecastForDate(date, userId);
  if (!forecast) {
    // Auto-generate on first visit of the day (the §3.5 cron-failure fallback).
    forecast = await generateAndPersistForecast(date);
    if (userId) forecast = (await fetchForecastForDate(date, userId))!;
  }

  res.json({ forecast });
});

/* ── GET /api/forecast/history ───────────────────────────────────────── */

router.get('/history', async (req, res) => {
  const { days } = historyQuerySchema.parse(req.query);
  const userId = req.isAuthenticated() ? (req.user as { id: string }).id : null;

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - (days - 1));
  const sinceDate = since.toISOString().slice(0, 10);

  const forecasts = await db
    .select({ id: schema.scamForecasts.id, date: schema.scamForecasts.forecastDate })
    .from(schema.scamForecasts)
    .where(gte(schema.scamForecasts.forecastDate, sinceDate))
    .orderBy(desc(schema.scamForecasts.forecastDate))
    .limit(days);

  const out: ForecastOut[] = [];
  for (const f of forecasts) {
    const full = await fetchForecastForDate(f.date, userId);
    if (full) out.push(full);
  }

  res.json({ forecasts: out });
});

/* ── POST /api/forecast/generate ─────────────────────────────────────── */

router.post('/generate', requireAuth, async (req, res) => {
  const date = todayUtc();
  const forecast = await generateAndPersistForecast(date);
  // Re-fetch with the caller's votes so the response is immediately renderable.
  const userId = (req.user as { id: string }).id;
  const withVotes = await fetchForecastForDate(date, userId);
  res.json({ forecast: withVotes ?? forecast });
});

/* ── POST /api/forecast/:itemId/vote ─────────────────────────────────── */

router.post('/:itemId/vote', requireAuth, async (req, res) => {
  const itemId = z.string().uuid().parse(req.params.itemId);
  const { vote } = voteSchema.parse(req.body);
  const userId = (req.user as { id: string }).id;

  // Verify the item exists.
  const [item] = await db
    .select({ id: schema.scamForecastItems.id, forecastId: schema.scamForecastItems.forecastId })
    .from(schema.scamForecastItems)
    .where(eq(schema.scamForecastItems.id, itemId))
    .limit(1);
  if (!item) throw new AppError(404, 'Forecast item not found.');

  // Upsert the vote row. One vote per user per item.
  await db
    .insert(schema.forecastVotes)
    .values({ userId, forecastItemId: itemId, vote })
    .onConflictDoUpdate({
      target: [schema.forecastVotes.userId, schema.forecastVotes.forecastItemId],
      set: { vote },
    });

  // Recompute tallies from the votes table so a buggy client can't drift them.
  const [tally] = await db
    .select({
      believeCount: sql<number>`COUNT(*) FILTER (WHERE fv.vote = 'believe')`.as(
        'believe_count'
      ),
      doubtCount: sql<number>`COUNT(*) FILTER (WHERE fv.vote = 'doubt')`.as(
        'doubt_count'
      ),
      skipCount: sql<number>`COUNT(*) FILTER (WHERE fv.vote = 'skip')`.as(
        'skip_count'
      ),
    })
    .from(schema.forecastVotes)
    .where(eq(schema.forecastVotes.forecastItemId, itemId));

  await db
    .update(schema.scamForecastItems)
    .set({
      believeCount: Number(tally?.believeCount ?? 0),
      doubtCount: Number(tally?.doubtCount ?? 0),
      skipCount: Number(tally?.skipCount ?? 0),
    })
    .where(eq(schema.scamForecastItems.id, itemId));

  res.json({
    item: {
      id: itemId,
      myVote: vote,
      believeCount: Number(tally?.believeCount ?? 0),
      doubtCount: Number(tally?.doubtCount ?? 0),
      skipCount: Number(tally?.skipCount ?? 0),
    },
  });
});

export default router;
