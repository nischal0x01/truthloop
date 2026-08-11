/**
 * Web fetcher — RSS + HTML parsing for claim discovery.
 *
 * Provides:
 * - fetchRss(source): parses RSS/Atom feed → raw items
 * - fetchHtmlPage(url): extracts article text from a URL
 * - fetchWithRetry(url, opts): generic HTTP fetch with retry + backoff
 * - isDuplicate(a, b): lightweight text deduplication
 */

import { load } from 'cheerio';
import Parser from 'rss-parser';
import { logger } from '@/utils/logger.js';
import { RssSource, MAX_ITEMS_PER_SOURCE } from './sources.js';

const USER_AGENT = process.env.SCRAPE_USER_AGENT ?? 'TruthLoop/1.0 (UNESCO MIL Hackathon; +https://truthloop.app)';

// ─── RSS Parser ─────────────────────────────────────────────────────────────
const rssParser = new Parser({
  timeout: 8000,
  headers: { 'User-Agent': USER_AGENT },
  customFields: {
    item: [
      ['media:content', 'mediaContent', { keepArray: false }],
      ['media:thumbnail', 'mediaThumbnail', { keepArray: false }],
    ],
  },
});

// ─── Generic fetch with retry ────────────────────────────────────────────────
interface FetchOptions {
  timeoutMs?: number;
  retries?: number;
  headers?: Record<string, string>;
}

async function fetchWithRetry(
  url: string,
  { timeoutMs = 8000, retries = 2, headers = {} }: FetchOptions = {}
): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    for (let attempt = 0; attempt <= retries; attempt++) {
      if (attempt > 0) await new Promise((r) => setTimeout(r, 500 * attempt));
      try {
        const res = await fetch(url, {
          signal: ctrl.signal,
          headers: { 'User-Agent': USER_AGENT, Accept: 'application/rss+xml, application/xml, text/html, */*', ...headers },
          redirect: 'follow',
        });
        if (res.ok || res.status === 200) return res;
        throw new Error(`HTTP ${res.status}`);
      } catch (e) {
        if (attempt === retries) throw e;
      }
    }
    throw new Error('Unreachable');
  } finally {
    clearTimeout(timer);
  }
}

// ─── RSS Fetcher ─────────────────────────────────────────────────────────────
export interface RawRssItem {
  title: string;
  link?: string;
  pubDate?: string;
  contentSnippet?: string;
  sourceName: string;
}

export async function fetchRss(source: RssSource): Promise<RawRssItem[]> {
  try {
    const feed = await rssParser.parseURL(source.url);
    const cutoff = source.maxAgeHours
      ? new Date(Date.now() - source.maxAgeHours * 60 * 60 * 1000)
      : new Date(0);

    const items: RawRssItem[] = [];
    for (const item of feed.items.slice(0, MAX_ITEMS_PER_SOURCE)) {
      const pubDate = item.pubDate ? new Date(item.pubDate) : new Date();
      if (pubDate < cutoff) continue;

      const raw = item.content ?? item.contentSnippet ?? '';
      const snippet = raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300);

      items.push({
        title: item.title ?? '',
        link: item.link,
        pubDate: item.pubDate,
        contentSnippet: snippet,
        sourceName: source.name,
      });
    }
    logger.info(`[scraper] Fetched ${items.length} items from ${source.name}`);
    return items;
  } catch (err) {
    logger.warn(`[scraper] Failed to fetch RSS ${source.name}: ${err instanceof Error ? err.message : String(err)}`);
    return [];
  }
}

// ─── HTML Fetcher ─────────────────────────────────────────────────────────────
export interface ScrapedPage {
  url: string;
  title: string;
  text: string;
  publishedAt?: string;
}

export async function fetchHtmlPage(url: string): Promise<ScrapedPage | null> {
  try {
    const res = await fetchWithRetry(url, { timeoutMs: 10000 });
    const $ = load(await res.text());

    const title =
      $('h1').first().text().trim() ||
      $('article h1').first().text().trim() ||
      $('meta[property="og:title"]').attr('content')?.trim() ||
      $('title').first().text().trim() ||
      '';

    const articleSelectors = ['article', '[role="main"]', '.article-body', '.story-body', '.post-content', '.entry-content', 'main'];
    let text = '';
    for (const sel of articleSelectors) {
      const el = $(sel).first();
      if (el.length) {
        text = el.text().replace(/\s+/g, ' ').replace(/Share on (Facebook|Twitter|LinkedIn|Reddit|Pinterest|WhatsApp|Telegram)/gi, '').trim();
        break;
      }
    }
    if (!text) {
      text = $('p').map((_, el) => $(el).text().trim()).get().filter((t) => t.length > 50).join(' ').replace(/\s+/g, ' ').trim();
    }

    const publishedAt =
      $('meta[property="article:published_time"]').attr('content') ||
      $('time[datetime]').attr('datetime') ||
      $('meta[name="date"]').attr('content') ||
      undefined;

    return { url, title, text: text.slice(0, 2000), publishedAt };
  } catch (err) {
    logger.warn(`[scraper] Failed to fetch page ${url}: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

// ─── Deduplication ────────────────────────────────────────────────────────────
export function isDuplicate(a: string, b: string, threshold = 0.5): boolean {
  const words = (s: string) =>
    new Set(s.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter((w) => w.length > 3));
  const setA = words(a);
  const setB = words(b);
  const intersection = [...setA].filter((w) => setB.has(w)).length;
  const union = new Set([...setA, ...setB]).size;
  return union > 0 && intersection / union >= threshold;
}
