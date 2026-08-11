/**
 * Discoveries API + types — mirrors server/src/routes/discoveries.ts.
 *
 * These are claims scraped from the web and run through the 3-filter AI pipeline.
 * Shown as a "what's trending online" discovery feed.
 */

import { api } from './api';

/* ── Types ── */

export type DiscoveryDecision =
  | 'publish_as_scam'
  | 'publish_as_misinfo'
  | 'flag_review'
  | 'reject';

export interface Discovery {
  id: string;
  /** The scraped claim text */
  text: string;
  sourceUrl: string | null;
  sourceName: string;
  scrapedAt: string | null;
  /** Filter 1 — truth verdict */
  aiVerdict: string;
  aiConfidence: number;
  aiReason: string | null;
  /** Filter 2 — public sentiment */
  feelsScam: boolean;
  scamSentiment: number;
  /** Filter 3 — scam verification */
  isScam: boolean;
  scamType: string | null;
  scamSeverity: string | null;
  scamExplanation: string | null;
  /** Composite pipeline decision */
  decision: DiscoveryDecision;
  processedAt: string | null;
}

/* ── API ── */

export const discoveriesApi = {
  list: (limit = 20, offset = 0) =>
    api<{ discoveries: Discovery[]; total: number; limit: number; offset: number }>(
      '/api/discoveries',
      { query: { limit, offset } }
    ),

  get: (id: string) =>
    api<{ discovery: Discovery }>(`/api/discoveries/${id}`),
};

/* ── TanStack Query keys ── */

export const discoveryKeys = {
  all: ['discoveries'] as const,
  list: (limit?: number, offset?: number) =>
    [...discoveryKeys.all, 'list', { limit, offset }] as const,
  detail: (id: string) => [...discoveryKeys.all, 'detail', id] as const,
};

/* ── Decision / severity display helpers ── */

export function decisionLabel(decision: DiscoveryDecision): string {
  switch (decision) {
    case 'publish_as_scam': return '⚠️ Scam alert';
    case 'publish_as_misinfo': return '❌ Misinformation';
    case 'flag_review': return '⏳ Under review';
    default: return '—';
  }
}

export function severityLabel(severity: string | null | undefined): string {
  switch (severity) {
    case 'high': return '🔴 High risk';
    case 'medium': return '🟡 Medium risk';
    case 'low': return '🟢 Low risk';
    default: return '';
  }
}

export function scamTypeLabel(type: string | null | undefined): string {
  const map: Record<string, string> = {
    phishing: 'Phishing',
    fake_news: 'Fake news',
    misleading: 'Misleading',
    investment_fraud: 'Investment fraud',
    impersonation: 'Impersonation',
    none: 'General misinformation',
  };
  return type ? (map[type] ?? type) : '';
}
