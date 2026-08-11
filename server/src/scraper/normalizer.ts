/**
 * Normalizer — converts raw scraped items into structured `ScrapedClaim`
 * objects ready to pass through the 3-filter AI pipeline.
 *
 * Normalization steps:
 * 1. Drop items that are too short, too long, or not claim-like
 * 2. Strip outlet names, bylines, social sharing text
 * 3. Extract the core factual statement
 * 4. Deduplicate against already-seen claims
 */

import { RawRssItem } from './fetcher.js';
import { ScrapedClaim, ScrapedClaimSchema } from '../ai/minimax/schemas.js';
import { isDuplicate } from './fetcher.js';
import { logger } from '@/utils/logger.js';

/**
 * Known non-claim patterns — filter these out early.
 * These are not fact-checkable claims.
 */
const SKIP_PATTERNS = [
  /^(?:watch|read|click|follow|subscribe|share|download|install|sign up)/i,
  /^(?:advertisement|sponsored|partner content|promo)/i,
  /^\d+\s+(?:people|users|tweets|comments|reactions)/i, // social counts
  /how to (?:make|do|get|buy|sell)/i,                     // how-to articles
  /^opinion:?/i,
  /^analysis:?/i,
  /^breaking:?/i,
  /^live[,:]/i,
  /^(?:podcast|video|episode|interview|exclusive)/i,
  /^poll[,:]/i,
  /\$\d+/, // prices, stock prices — not fact claims
  /^quote?:/i,
  /^photo [a-z]+:?/i,
];

function isClaimLike(text: string): boolean {
  // Must be a statement of fact (not a question, not an opinion, not a list)
  if (text.length < 20 || text.length > 500) return false;
  if (SKIP_PATTERNS.some((p) => p.test(text))) return false;
  // Should not be a question
  if (text.endsWith('?')) return false;
  // Should not be mostly numbers/dates (e.g. sports scores, stock tickers)
  const alphaRatio = text.replace(/[^a-zA-Z]/g, '').length / text.length;
  if (alphaRatio < 0.4) return false;
  return true;
}

/**
 * Strips publisher boilerplate from headlines:
 * - Removes outlet name from end: "Title :: Publisher" → "Title"
 * - Removes "— Publisher Name" suffix
 * - Removes common suffixes like "| Channel", "- Channel", "[Source]"
 */
function stripPublisher(text: string): string {
  return text
    .replace(/\s*::\s*[^:]+$/, '') // "Title :: BBC"
    .replace(/\s*[—–-]\s*[^—–-]+$/, '') // "Title — BBC News"
    .replace(/\s*\|\s*[^|]+$/, '') // "Title | Channel"
    .replace(/\s*\[([^\]]+)\]$/, '') // "Title [Source]"
    .replace(/^(?:From|Part \d+[,:])\s*/i, '') // "From BBC:", "Part 1: ..."
    .trim();
}

/**
 * Converts a raw RSS item into a ScrapedClaim if it looks like a fact claim.
 * Returns null if the item is skipped (not claim-like, too old, etc.).
 */
function normalizeItem(item: RawRssItem): ScrapedClaim | null {
  const title = stripPublisher(item.title || '');
  const content = stripPublisher(item.contentSnippet || '');

  // Combine title + snippet for analysis
  const combined = content.length > title.length ? `${title}. ${content}` : title;

  if (!isClaimLike(combined)) {
    return null;
  }

  // Extract the most claim-like sentence from the combined text
  const sentences = combined
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20 && s.length < 300);

  if (sentences.length === 0) return null;

  // Use the longest meaningful sentence as the claim
  const bestSentence = sentences.reduce((a, b) => (a.length > b.length ? a : b));

  // Validate with Zod
  const parsed = ScrapedClaimSchema.safeParse({
    rawText: bestSentence,
    sourceUrl: item.link,
    sourceName: item.sourceName,
    scrapedAt: new Date().toISOString(),
  });

  if (!parsed.success) {
    logger.debug(`[scraper] Normalized claim failed Zod validation: ${parsed.error.message}`);
    return null;
  }

  return parsed.data;
}

/**
 * Normalize + deduplicate a list of raw RSS items.
 * Returns the deduplicated list of ScrapedClaims.
 */
export function normalizeItems(items: RawRssItem[]): ScrapedClaim[] {
  const seen: string[] = [];
  const claims: ScrapedClaim[] = [];

  for (const item of items) {
    const claim = normalizeItem(item);
    if (!claim) continue;

    // Deduplicate against already-accepted claims
    const isDupe = seen.some((s) => isDuplicate(s, claim.rawText));
    if (isDupe) {
      logger.debug(`[scraper] Deduped: "${claim.rawText.slice(0, 60)}..."`);
      continue;
    }

    seen.push(claim.rawText);
    claims.push(claim);
  }

  return claims;
}

/**
 * Filter claims that are too time-sensitive to be useful.
 * E.g., "X just happened" claims older than 12h are useless.
 */
export function filterTimeSensitive(claims: ScrapedClaim[], maxAgeHours = 24): ScrapedClaim[] {
  const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);

  return claims.filter((c) => {
    const scraped = new Date(c.scrapedAt);
    return scraped >= cutoff;
  });
}
