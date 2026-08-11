/**
 * Web scraping sources — for misinformation discovery.
 *
 * Discovery philosophy (per project_context.md):
 * 1. Scrape news/social sources for viral, potentially misleading claims
 * 2. Claude verifies against BBC/CNN/Reuters → verdict + explanation
 * 3. Publish to user feed → users VOTE → blind-spot report
 *
 * Primary source: Google News RSS (searches for misinformation-related headlines)
 * Secondary: Reddit (r/conspiracy, r/worldnews), mainstream RSS
 */

export interface RssSource {
  type: 'rss';
  name: string;
  url: string;
  maxAgeHours?: number;
}

export type ScrapeSource = RssSource;

// ─── Google News searches — designed to surface viral/misinformation claims ─────────────────────────
/**
 * Google News RSS queries targeting misinformation-prone topics.
 * These queries find headlines about hot-button issues where misinformation is common.
 */
export const RSS_SOURCES: RssSource[] = [
  // Misinformation-prone search queries via Google News
  {
    type: 'rss',
    name: 'Google News: Health Misinformation',
    url: 'https://news.google.com/rss/search?q=health+misinformation+fake+cure&hl=en-US&gl=US&ceid=US:en',
    maxAgeHours: 24,
  },
  {
    type: 'rss',
    name: 'Google News: Political Claims',
    url: 'https://news.google.com/rss/search?q=political+claim+debunked+fact+check&hl=en-US&gl=US&ceid=US:en',
    maxAgeHours: 24,
  },
  {
    type: 'rss',
    name: 'Google News: Viral Misinformation',
    url: 'https://news.google.com/rss/search?q=viral+misinformation+debunked+false&hl=en-US&gl=US&ceid=US:en',
    maxAgeHours: 24,
  },
  {
    type: 'rss',
    name: 'Google News: Scam Alerts',
    url: 'https://news.google.com/rss/search?q=scam+alert+fake+fraud+warning&hl=en-US&gl=US&ceid=US:en',
    maxAgeHours: 24,
  },
  {
    type: 'rss',
    name: 'Google News: Old News Resurfacing',
    url: 'https://news.google.com/rss/search?q=old+news+resurfaced+misleading+viral&hl=en-US&gl=US&ceid=US:en',
    maxAgeHours: 48,
  },
  {
    type: 'rss',
    name: 'Google News: Social Media Claims',
    url: 'https://news.google.com/rss/search?q=social+media+claim+fact+check+reddit&hl=en-US&gl=US&ceid=US:en',
    maxAgeHours: 24,
  },
];

export const MAX_SOURCES_PER_RUN = 4;
export const MAX_ITEMS_PER_SOURCE = 30;
