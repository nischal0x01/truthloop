/**
 * Scraper main entry — orchestrates fetching + normalization.
 *
 * Exported:
 *   scrapeAndProcess(): Promise<ScrapedClaim[]>
 *     1. Picks N sources (RSS + search) from the pool
 *     2. Fetches all in parallel
 *     3. Normalizes + deduplicates
 *     4. Returns AI-ready claims
 *
 *   scrapeSource(source): Promise<ScrapedClaim[]>
 *     Single-source scrape for on-demand use (admin trigger).
 */

import { logger } from '@/utils/logger.js';
import {
  RSS_SOURCES,
  SEARCH_QUERIES,
  MAX_SOURCES_PER_RUN,
  type ScrapeSource,
  type RssSource,
} from './sources.js';
import { fetchRss, type RawRssItem } from './fetcher.js';
import { normalizeItems, filterTimeSensitive } from './normalizer.js';
import { ScrapedClaim } from '../ai/minimax/schemas.js';

// ─── Shuffle helper (round-robin source selection) ───────────────────────────
let _sourceIndex = 0;
function pickSources<T extends { name: string }>(sources: T[], count: number): T[] {
  // Rotate through sources so we don't hammer the same one every run
  const start = _sourceIndex % sources.length;
  _sourceIndex += count;
  const picked: T[] = [];
  for (let i = 0; i < count; i++) {
    picked.push(sources[(start + i) % sources.length]);
  }
  return picked;
}

// ─── Single source scrape ────────────────────────────────────────────────────
export async function scrapeSource(source: ScrapeSource): Promise<ScrapedClaim[]> {
  if (source.type === 'rss') {
    const items = await fetchRss(source as RssSource);
    const claims = normalizeItems(items);
    return filterTimeSensitive(claims);
  }

  // Search source — for now, fall back to RSS from the same outlet
  // Full Google Dorks / SERP integration would need a SERP API key (Google, SerpAPI, etc.)
  // For the hackathon, MiniMax itself acts as the "search" — it knows what scams are trending
  logger.debug(`[scraper] Search source ${source.name} — falling back to MiniMax contextual knowledge`);
  return [];
}

// ─── Main multi-source scrape ───────────────────────────────────────────────
/**
 * Scrape multiple sources in parallel, normalize, deduplicate.
 * Returns claims ready to feed through the 3-filter AI pipeline.
 *
 * Batches claims to avoid sending too many to MiniMax at once.
 */
export async function scrapeAndProcess(): Promise<ScrapedClaim[]> {
  // Pick RSS sources (primary feed)
  const rssSources = pickSources(RSS_SOURCES, MAX_SOURCES_PER_RUN);
  const allItems: RawRssItem[] = [];
  const allErrors: string[] = [];

  logger.info(`[scraper] Starting run — scraping ${rssSources.length} RSS sources`);

  // Fetch all sources in parallel
  const results = await Promise.allSettled(rssSources.map((s) => fetchRss(s)));

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const source = rssSources[i];

    if (result.status === 'fulfilled') {
      allItems.push(...result.value);
    } else {
      allErrors.push(`${source.name}: ${result.reason?.message ?? String(result.reason)}`);
    }
  }

  if (allItems.length === 0) {
    logger.warn(`[scraper] All sources failed: ${allErrors.join('; ')}`);
    return [];
  }

  logger.info(`[scraper] Collected ${allItems.length} raw items from RSS`);

  // Normalize + deduplicate
  let claims = normalizeItems(allItems);
  claims = filterTimeSensitive(claims, 24);

  logger.info(`[scraper] Normalized to ${claims.length} unique claims after time-filter`);

  if (claims.length === 0) {
    logger.warn(`[scraper] No claim-like items found in this run`);
  }

  return claims;
}

/**
 * Scrape ALL sources (for admin "run now" trigger).
 * Returns more results but takes longer.
 */
export async function scrapeAllSources(): Promise<ScrapedClaim[]> {
  const allItems: RawRssItem[] = [];

  const results = await Promise.allSettled(RSS_SOURCES.map((s) => fetchRss(s)));

  for (const result of results) {
    if (result.status === 'fulfilled') {
      allItems.push(...result.value);
    }
  }

  let claims = normalizeItems(allItems);
  claims = filterTimeSensitive(claims, 48);
  return claims;
}
