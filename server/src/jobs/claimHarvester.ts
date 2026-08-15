/**
 * Hourly claim-harvester cron — runs at the top of every hour (configurable).
 *
 * Pipeline:
 *   1. Issue a small set of seed web-search queries via `searchWeb()`
 *      (MiniMax Token Plan). Each query targets a different surface of
 *      trending misinformation + scams so the batch is diverse.
 *   2. Dedupe the combined result set (URL + title).
 *   3. Hand the cleaned evidence + seed queries to the harvest prompt
 *      (`buildClaimHarvestPrompt`), which asks Claude to extract SPECIFIC
 *      factual claims AND verify each one in a single structured call.
 *   4. Drop items whose verdict is "unverified" or confidence is below
 *      `MIN_CONFIDENCE`. Also drop items whose normalised text already
 *      exists in the claims table from the last `DEDUPE_WINDOW_DAYS`.
 *   5. Insert what survives, marked `origin: 'auto'`, with `publishedAt`
 *      set to now and `trending_score` seeded from Claude's `trendSignal`
 *      (with a recency boost so fresh items float to the top).
 *
 * The job is fully non-fatal — every step catches + logs and continues.
 * Worst case the hourly run logs "no fresh claims this hour" and exits.
 *
 * Manual trigger:
 *   tsx -e "import('./src/jobs/claimHarvester.js').then(m => m.runClaimHarvest().then(() => process.exit(0)))"
 */

import { gte } from 'drizzle-orm';
import { db, schema } from '@/db';
import { config } from '@/config';
import { logger } from '@/utils/logger';
import {
  buildClaimHarvestPrompt,
  generateStructured,
  harvestBatchSchema,
  harvestBatchFallback,
  type HarvestBatch,
} from '@/ai';
import { searchWeb, type SearchResult } from '@/ai/search';

/* ── Configuration (env-overridable via config.harvest) ─────────────── */

const MAX_ITEMS = Math.min(Math.max(config.harvest.maxPerRun, 1), 5);
/** Min AI confidence to keep a candidate. Below this → drop. */
const MIN_CONFIDENCE = 50;
/** Don't re-insert a claim whose text closely matches one inserted in this window. */
const DEDUPE_WINDOW_DAYS = 14;

/**
 * Seed queries — kept short so each one fits MiniMax's search budget.
 * Ordered roughly: debunkers first (highest signal), then scam pattern
 * trackers, then raw trending. The order doesn't affect quality, only
 * the order results arrive in (we dedupe by URL anyway).
 */
const SEED_QUERIES: ReadonlyArray<string> = [
  'trending fact check viral misinformation this week',
  'new scam alert phishing deepfake',
  'misattributed quote viral social media',
];

/* ── Result types ────────────────────────────────────────────────────── */

export interface ClaimHarvestSummary {
  /** ISO date the harvest ran for. */
  today: string;
  /** Raw search results returned by MiniMax across all seed queries (deduped). */
  searchHits: number;
  /** Items Claude extracted + verified. */
  aiItems: number;
  /** Items dropped because verdict=unverified or confidence below threshold. */
  droppedUnverified: number;
  /** Items dropped because the text closely matched a recent claim in DB. */
  droppedDuplicate: number;
  /** Items actually inserted into `claims`. */
  inserted: number;
  /** Wall-clock duration in ms. */
  durationMs: number;
}

/* ── Helpers ─────────────────────────────────────────────────────────── */

/**
 * Normalise claim text for dedup matching.
 *   - lowercase
 *   - strip surrounding whitespace + quotes
 *   - collapse internal whitespace
 *   - strip trailing punctuation noise
 *
 * Two claims whose normalised form matches within DEDUPE_WINDOW_DAYS are
 * considered duplicates. Conservative: false-negatives (two near-identical
 * claims slip through) are fine; false-positives (a legitimately-new claim
 * gets blocked by an old similar one) would silently shrink the feed.
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/^["'\s]+|["'\s]+$/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[.,;:!?]+$/g, '')
    .trim();
}

/** Map a 0–100 trendSignal + a freshness boost into a 0–100 trending_score. */
function trendingScore(trendSignal: number | undefined, ageMs: number): number {
  const signal = typeof trendSignal === 'number' ? trendSignal : 50;
  // Freshness: 1.0 at t=0, decays to ~0.85 after 1h, ~0.5 after a day.
  const freshness = Math.max(0.4, 1 - ageMs / (24 * 60 * 60 * 1000));
  const score = signal * freshness;
  return Math.max(0, Math.min(100, Math.round(score)));
}

/** Dedupe search results by URL (preferred) or title. */
function dedupeResults(results: SearchResult[]): SearchResult[] {
  const seen = new Set<string>();
  const out: SearchResult[] = [];
  for (const r of results) {
    const key = r.url || r.title;
    if (!key) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

/** Run all seed queries in parallel and return a deduped, flattened array. */
async function gatherEvidence(): Promise<SearchResult[]> {
  const queries = SEED_QUERIES.slice(0, Math.max(1, Math.min(SEED_QUERIES.length, 3)));
  const settled = await Promise.allSettled(
    queries.map((q) => searchWeb(q, { maxResults: 5 }))
  );
  const flat: SearchResult[] = [];
  for (const s of settled) {
    if (s.status === 'fulfilled') flat.push(...s.value);
  }
  return dedupeResults(flat);
}

/**
 * Build a set of normalised texts that already exist in `claims` from the
 * last `DEDUPE_WINDOW_DAYS`. Used to drop harvest candidates that are
 * re-treads of recently-inserted claims.
 */
async function fetchRecentClaimTexts(): Promise<Set<string>> {
  const since = new Date(Date.now() - DEDUPE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({ text: schema.claims.text })
    .from(schema.claims)
    .where(gte(schema.claims.createdAt, since));
  return new Set(rows.map((r) => normalize(r.text)));
}

/**
 * Render the verified `facts` (headline + bullet reasons) into a single
 * `explanation` column matching the shape of the seed / submission rows.
 * Plain text with the headline as a leading sentence and reasons as
 * newlines — same convention `flattenExplanation()` uses for /submit.
 */
function buildExplanation(headline: string, reasons: string[]): string {
  const head = headline.trim();
  const bullets = reasons.map((r) => `• ${r.trim()}`).join('\n');
  return bullets ? `${head}\n\n${bullets}` : head;
}

/* ── Main ────────────────────────────────────────────────────────────── */

/**
 * Run one harvest pass. Safe to call directly for manual triggers — never
 * throws, always returns a structured summary for the caller (cron or
 * one-off `tsx -e`) to log.
 */
export async function runClaimHarvest(): Promise<ClaimHarvestSummary> {
  const start = Date.now();
  const today = new Date().toISOString().slice(0, 10);

  const summary: ClaimHarvestSummary = {
    today,
    searchHits: 0,
    aiItems: 0,
    droppedUnverified: 0,
    droppedDuplicate: 0,
    inserted: 0,
    durationMs: 0,
  };

  // 1. Evidence ────────────────────────────────────────────────────────
  let evidence: SearchResult[] = [];
  try {
    evidence = await gatherEvidence();
  } catch (err) {
    logger.error({ err }, '[job] harvest: evidence gather threw');
  }
  summary.searchHits = evidence.length;

  if (evidence.length === 0) {
    logger.info(
      { ...summary, durationMs: Date.now() - start },
      '[job] harvest: no search evidence — skipping AI call'
    );
    return { ...summary, durationMs: Date.now() - start };
  }

  // 2. Extract + verify ────────────────────────────────────────────────
  let batch: HarvestBatch = harvestBatchFallback;
  try {
    const { system, prompt, userInput } = buildClaimHarvestPrompt({
      today,
      seedQueries: SEED_QUERIES.slice(0, 3),
      searchResults: evidence,
      maxItems: MAX_ITEMS,
    });
    batch = await generateStructured<HarvestBatch>({
      system,
      prompt,
      userInput,
      schema: harvestBatchSchema,
      fallback: harvestBatchFallback,
      model: 'strong',
      maxTokens: 2048,
    });
  } catch (err) {
    logger.error({ err }, '[job] harvest: AI call threw');
  }
  summary.aiItems = batch.items.length;

  if (batch.items.length === 0) {
    logger.info(
      { ...summary, durationMs: Date.now() - start },
      '[job] harvest: AI returned no items this hour'
    );
    return { ...summary, durationMs: Date.now() - start };
  }

  // 3. Filter: verdict + confidence ────────────────────────────────────
  const verified = batch.items.filter((item) => {
    if (item.verdict === 'unverified') {
      summary.droppedUnverified++;
      return false;
    }
    if (item.confidence < MIN_CONFIDENCE) {
      summary.droppedUnverified++;
      return false;
    }
    return true;
  });

  if (verified.length === 0) {
    logger.info(
      { ...summary, durationMs: Date.now() - start },
      '[job] harvest: all candidates below confidence threshold'
    );
    return { ...summary, durationMs: Date.now() - start };
  }

  // 4. Filter: dedupe against recent claims ────────────────────────────
  let recent: Set<string>;
  try {
    recent = await fetchRecentClaimTexts();
  } catch (err) {
    // If the dedupe check fails, fall through and insert — better to risk
    // a near-duplicate than to skip the entire hour's harvest.
    logger.error({ err }, '[job] harvest: dedupe lookup threw — inserting without it');
    recent = new Set();
  }

  const fresh = verified.filter((item) => {
    const norm = normalize(item.text);
    if (recent.has(norm)) {
      summary.droppedDuplicate++;
      return false;
    }
    return true;
  });

  if (fresh.length === 0) {
    logger.info(
      { ...summary, durationMs: Date.now() - start },
      '[job] harvest: every candidate was a duplicate of a recent claim'
    );
    return { ...summary, durationMs: Date.now() - start };
  }

  // 5. Insert ──────────────────────────────────────────────────────────
  const now = new Date();
  const rows = fresh.slice(0, MAX_ITEMS).map((item) => ({
    text: item.text.trim(),
    verdict: item.verdict as 'real' | 'fake', // 'unverified' already filtered
    category: item.category,
    explanation: buildExplanation(item.headline, item.reasons),
    sourceUrl: item.sources?.[0]?.url ?? null,
    isPublished: true,
    publishedAt: now,
    trendingScore: trendingScore(item.trendSignal, 0),
    voteCount: 0,
    origin: 'auto' as const,
  }));

  try {
    // `returning()` so we can confirm the inserts landed — the schema
    // doesn't have a unique-text index, so this is the only signal.
    await db.insert(schema.claims).values(rows);
    summary.inserted = rows.length;
  } catch (err) {
    logger.error({ err }, '[job] harvest: insert threw');
  }

  summary.durationMs = Date.now() - start;
  logger.info({ ...summary }, '[job] harvest complete');
  return summary;
}
