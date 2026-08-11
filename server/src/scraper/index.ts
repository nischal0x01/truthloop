/**
 * Scraper main entry — orchestrates fetching + normalization.
 *
 * Discovery philosophy (per project_context.md):
 * 1. Scrape news sources (Google News RSS for misinformation-prone topics)
 * 2. Claude verifies claim against BBC/CNN/Reuters → verdict + explanation
 * 3. Publish verified claims to user feed
 * 4. Users VOTE → reveal verdict → blind-spot report
 *
 * NO AI filtering on discovery — just raw scraping.
 */

import { logger } from '@/utils/logger.js';
import {
  RSS_SOURCES,
  MAX_SOURCES_PER_RUN,
  type ScrapeSource,
  type RssSource,
} from './sources.js';
import { fetchRss, type RawRssItem } from './fetcher.js';
import { normalizeItems, filterTimeSensitive } from './normalizer.js';
import { ScrapedClaim } from '../ai/minimax/schemas.js';

// ─── Round-robin source selection ──────────────────────────────────────────
let _sourceIndex = 0;
function pickSources<T extends { name: string }>(sources: T[], count: number): T[] {
  const start = _sourceIndex % sources.length;
  _sourceIndex += count;
  return Array.from({ length: count }, (_, i) => sources[(start + i) % sources.length]);
}

// ─── Main multi-source scrape ───────────────────────────────────────────────
export async function scrapeAndProcess(): Promise<ScrapedClaim[]> {
  const sources = pickSources(RSS_SOURCES, MAX_SOURCES_PER_RUN);
  const allItems: RawRssItem[] = [];
  const errors: string[] = [];

  logger.info(`[scraper] Starting run — scraping ${sources.length} sources`);

  const results = await Promise.allSettled(sources.map((s) => fetchRss(s as RssSource)));

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const source = sources[i];
    if (result.status === 'fulfilled') {
      allItems.push(...result.value);
    } else {
      errors.push(`${source.name}: ${result.reason?.message ?? String(result.reason)}`);
    }
  }

  if (allItems.length === 0) {
    logger.warn(`[scraper] All sources failed: ${errors.join('; ')}`);
    return [];
  }

  logger.info(`[scraper] Collected ${allItems.length} raw items`);

  const claims = normalizeItems(allItems);
  const filtered = filterTimeSensitive(claims, 24);

  logger.info(`[scraper] Normalized to ${filtered.length} unique claims`);
  return filtered;
}

// ─── Full scrape (admin "run now") ─────────────────────────────────────────
export async function scrapeAllSources(): Promise<ScrapedClaim[]> {
  const allItems: RawRssItem[] = [];
  const results = await Promise.allSettled(RSS_SOURCES.map((s) => fetchRss(s)));
  for (const result of results) {
    if (result.status === 'fulfilled') allItems.push(...result.value);
  }
  return filterTimeSensitive(normalizeItems(allItems), 48);
}
