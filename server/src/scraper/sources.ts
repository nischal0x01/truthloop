/**
 * Web scraping sources — RSS feeds and search engine configs.
 *
 * Each source has a `type` and config needed to fetch from it.
 * Sources are tried in rotation to avoid hammering any single one.
 */

export interface RssSource {
  type: 'rss';
  name: string;
  url: string;
  /** Only extract items published within this many hours */
  maxAgeHours?: number;
}

export interface SearchSource {
  type: 'search';
  name: string;
  query: string; // Google Dorks query, e.g. "scam site:reddit.com"
  maxResults?: number;
}

export type ScrapeSource = RssSource | SearchSource;

/**
 * Primary RSS feeds — credible, globally-relevant news.
 * Rotated each scrape run to spread load.
 */
export const RSS_SOURCES: RssSource[] = [
  {
    type: 'rss',
    name: 'BBC World',
    url: 'https://feeds.bbci.co.uk/news/world/rss.xml',
    maxAgeHours: 48,
  },
  {
    type: 'rss',
    name: 'Reuters World',
    url: 'https://www.reutersagency.com/feed/?best-topics=world-news',
    maxAgeHours: 48,
  },
  {
    type: 'rss',
    name: 'Al Jazeera',
    url: 'https://www.aljazeera.com/xml/rss/all.xml',
    maxAgeHours: 48,
  },
  {
    type: 'rss',
    name: 'NDTV World',
    url: 'https://feeds.ndtv.com/NDTV/world',
    maxAgeHours: 48,
  },
  {
    type: 'rss',
    name: 'The Guardian World',
    url: 'https://www.theguardian.com/world/rss',
    maxAgeHours: 48,
  },
  {
    type: 'rss',
    name: 'Himalayan Times',
    url: 'https://thehimalayantimes.com/rss',
    maxAgeHours: 48,
  },
];

/**
 * Trending search queries — run via Google Dorks or a SERP API.
 * These are designed to surface potential misinformation/scams.
 *
 * Uses MiniMax's own knowledge as context — MiniMax knows about
 * common scam patterns and can evaluate them.
 */
export const SEARCH_QUERIES: SearchSource[] = [
  {
    type: 'search',
    name: 'Scam Alert Queries',
    query: 'site:reddit.com OR site:twitter.com scam alert viral 2026',
    maxResults: 10,
  },
  {
    type: 'search',
    name: 'Misinformation Viral',
    query: 'site:facebook.com OR site:instagram.com viral fake news misinformation',
    maxResults: 10,
  },
  {
    type: 'search',
    name: 'Phishing Trend',
    query: 'phishing scam fake bank urgent account suspended',
    maxResults: 10,
  },
  {
    type: 'search',
    name: 'Investment Fraud',
    query: 'investment fraud crypto scam promised returns viral',
    maxResults: 10,
  },
];

/**
 * How many sources to scrape per run (rate limiting).
 * Max 5 to avoid IP blocks / rate limit hits.
 */
export const MAX_SOURCES_PER_RUN = 4;

/**
 * How many raw items to collect per source before filtering.
 * Deduplicated and filtered before sending to AI.
 */
export const MAX_ITEMS_PER_SOURCE = 20;
