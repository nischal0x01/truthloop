/**
 * Scam Forecast routes.
 * Mounted at /api/forecast
 *
 * GET  /api/forecast/today       — today's forecast (generate if missing)
 * POST /api/forecast/:itemId/vote — vote on a forecast item
 */
import { Router, type Request, type Response, type NextFunction } from 'express';
import { eq, and, sql, desc } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/db';
import { AppError } from '@/middleware/errorHandler';
import { callScamForecast } from '@/ai';
import { broadcast } from '@/sse/broadcaster.js';
import { Today } from '@/ai/shared.js';

const router = Router();

function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) throw new AppError(401, 'You must be signed in.');
  next();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Human-readable category names for the narrative */
const CATEGORY_LABELS: Record<string, string> = {
  upi_festival_scam: 'UPI festival scams',
  fake_airline_refund: 'Fake airline refund scams',
  crypto_airdrop_phishing: 'Crypto airdrop phishing',
  deepfake_video_call: 'Deepfake video call scams',
  job_offer_scam: 'Job offer scams',
  romance_scam: 'Romance scams',
  fake_charity: 'Fake charity scams',
  loan_app_scam: 'Loan app scams',
  general_vigilance: 'General social engineering',
};

/** Stub headlines/patterns used when no real data is available */
const DEFAULT_HEADLINES = [
  'Scam reports show increase in social engineering attacks globally',
  'Authorities warn of seasonal fraud patterns around festivals',
];
const DEFAULT_PATTERNS = [
  'Unsolicited messages asking for OTPs or bank details',
  'Fake customer support accounts on social media',
];

/**
 * Fetch or generate today's forecast.
 * Returns { forecast, items } where items is the 1–3 forecast items.
 */
async function getOrCreateTodayForecast() {
  // Try to find existing forecast for today
  const [existing] = await db
    .select()
    .from(schema.scamForecasts)
    .where(eq(schema.scamForecasts.forecastDate, Today))
    .limit(1);

  if (existing) {
    const items = await db
      .select()
      .from(schema.scamForecastItems)
      .where(eq(schema.scamForecastItems.forecastId, existing.id))
      .orderBy(desc(schema.scamForecastItems.severity)); // high first

    return { forecast: existing, items };
  }

  // Generate new forecast
  let generationStatus: 'success' | 'fallback' | 'failed' = 'success';
  let forecastItems: Awaited<ReturnType<typeof callScamForecast>> = [];

  try {
    forecastItems = await callScamForecast({
      today: Today,
      recentHeadlines: DEFAULT_HEADLINES,
      recentScamPatterns: DEFAULT_PATTERNS,
      region: 'global',
    });
  } catch {
    generationStatus = 'failed';
    forecastItems = [
      {
        severity: 'low' as const,
        category: 'general_vigilance',
        title: 'Stay vigilant against social engineering',
        description:
          'Scammers constantly adapt their tactics. Be cautious of unsolicited messages.',
        recommended_action: 'Verify any request through an official channel.',
      },
    ];
  }

  // Persist forecast row
  const [forecast] = await db
    .insert(schema.scamForecasts)
    .values({
      forecastDate: Today,
      generationStatus,
    })
    .returning();

  // Persist items
  if (forecastItems.length > 0) {
    await db.insert(schema.scamForecastItems).values(
      forecastItems.map((item) => ({
        forecastId: forecast.id,
        severity: item.severity,
        category: item.category,
        title: item.title,
        description: item.description,
        recommendedAction: item.recommended_action,
      }))
    );
  }

  const items = await db
    .select()
    .from(schema.scamForecastItems)
    .where(eq(schema.scamForecastItems.forecastId, forecast.id))
    .orderBy(desc(schema.scamForecastItems.severity));

  return { forecast, items };
}

// ─── Routes ──────────────────────────────────────────────────────────────────

/* GET /api/forecast/today */
router.get('/today', async (_req, res) => {
  const { forecast, items } = await getOrCreateTodayForecast();

  // Attach user's own votes if authenticated (handled in SSE/broadcast to client)
  res.json({
    forecast: {
      id: forecast.id,
      date: forecast.forecastDate,
      generationStatus: forecast.generationStatus,
    },
    items: items.map((item) => ({
      id: item.id,
      severity: item.severity,
      category: item.category,
      categoryLabel: CATEGORY_LABELS[item.category] ?? item.category,
      title: item.title,
      description: item.description,
      recommendedAction: item.recommendedAction,
      believeCount: item.believeCount,
      doubtCount: item.doubtCount,
      skipCount: item.skipCount,
    })),
  });
});

/* POST /api/forecast/:itemId/vote */
const voteSchema = z.object({
  vote: z.enum(['believe', 'doubt', 'skip']),
});

router.post('/:itemId/vote', requireAuth, async (req: Request, res: Response) => {
  const userId = (req.user as { id: string }).id;
  const itemId = String(req.params.itemId);
  const { vote } = voteSchema.parse(req.body);

  // Verify item exists
  const [item] = await db
    .select()
    .from(schema.scamForecastItems)
    .where(eq(schema.scamForecastItems.id, itemId))
    .limit(1);
  if (!item) throw new AppError(404, 'Forecast item not found.');

  // Upsert vote
  await db
    .insert(schema.forecastVotes)
    .values({ userId, forecastItemId: itemId, vote })
    .onConflictDoUpdate({
      target: [schema.forecastVotes.userId, schema.forecastVotes.forecastItemId],
      set: { vote },
    });

  // Recompute counts from source
  const [{ believe, doubt, skip }] = await db
    .select({
      believe: sql<number>`COUNT(*) FILTER (WHERE ${schema.forecastVotes.vote} = 'believe')`,
      doubt: sql<number>`COUNT(*) FILTER (WHERE ${schema.forecastVotes.vote} = 'doubt')`,
      skip: sql<number>`COUNT(*) FILTER (WHERE ${schema.forecastVotes.vote} = 'skip')`,
    })
    .from(schema.forecastVotes)
    .where(eq(schema.forecastVotes.forecastItemId, itemId));

  const counts = {
    believeCount: Number(believe ?? 0),
    doubtCount: Number(doubt ?? 0),
    skipCount: Number(skip ?? 0),
  };

  // Update denormalized counters on the item
  await db
    .update(schema.scamForecastItems)
    .set(counts)
    .where(eq(schema.scamForecastItems.id, itemId));

  // Broadcast update to all connected clients
  broadcast('scam-forecast', { itemId, ...counts });

  res.json({ ok: true, ...counts });
});

export default router;
