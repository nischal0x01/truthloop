/**
 * actions/reports.ts — Weekly blind-spot report payload for /reports/weekly.
 *
 * One composite call: GET /api/reports/weekly?kind=...&from=...&to=... returns
 * the report (or null) plus the resolved range metadata.
 */

import { api, ApiError } from '@/lib/api';
import { queryClient } from '@/providers';

/* ── Range ──────────────────────────────────────────── */

export type RangeKind = 'week' | 'month' | 'quarter' | 'custom';

export interface Range {
  kind: RangeKind;
  /** ISO date YYYY-MM-DD; required only when kind === 'custom'. */
  from?: string;
  to?: string;
}

export interface ResolvedRange {
  kind: RangeKind;
  from: string;
  to: string;
  label: string;
  bucket: 'day' | 'week';
}

export const DEFAULT_RANGE: Range = { kind: 'week' };

/* ── Range ↔ URL helpers ───────────────────────────────────────── */

/** Pull a valid `Range` from the URL search params, otherwise return DEFAULT_RANGE. */
export function rangeFromParams(params: URLSearchParams): Range {
  const raw = params.get('range');
  if (raw === 'month' || raw === 'quarter' || raw === 'custom') {
    const range: Range = { kind: raw };
    if (raw === 'custom') {
      const from = params.get('from');
      const to = params.get('to');
      if (from && to) {
        range.from = from;
        range.to = to;
      } else {
        return DEFAULT_RANGE;
      }
    }
    return range;
  }
  return DEFAULT_RANGE;
}

/** Encode a `Range` back into URL search params (only writes non-default). */
export function rangeToParams(range: Range): URLSearchParams {
  const params = new URLSearchParams();
  if (range.kind !== 'week') {
    params.set('range', range.kind);
  }
  if (range.kind === 'custom') {
    if (range.from) params.set('from', range.from);
    if (range.to) params.set('to', range.to);
  }
  return params;
}

/* ── Types ──────────────────────────────────────────── */

export interface WeeklyReportReplay {
  id: string;
  text: string;
  category: string;
  verdict: 'real' | 'fake';
  explanation: string | null;
  sourceUrl: string | null;
}

export interface WeeklyReportCategoryStat {
  category: string;
  total: number;
  correct: number;
  accuracy: number;
}

export interface WeeklyReportTrendPoint {
  /** ISO date (YYYY-MM-DD). */
  day: string;
  total: number;
  correct: number;
  accuracy: number;
  /** How this point was bucketed on the server — affects label rendering. */
  bucket: 'day' | 'week';
}

export interface WeeklyReport {
  weekStarting: string;
  totalGuesses: number;
  correctGuesses: number;
  blindSpotCategory: string | null;
  blindSpotNarrative: string | null;
  globalAverageAccuracy: number | null;
  userAccuracy: number | null;
  createdAt: string;
  replayClaim: WeeklyReportReplay | null;
  categoryBreakdown: WeeklyReportCategoryStat[];
  trend: WeeklyReportTrendPoint[];
}

export interface WeeklyReportResponse {
  report: WeeklyReport | null;
  range: ResolvedRange | null;
}

/* ── Query keys ──────────────────────────────────────── */

export const reportKeys = {
  all: ['reports'] as const,
  weeklyRange: (range: Range) =>
    [
      ...reportKeys.all,
      'weekly',
      'range',
      range.kind,
      range.from ?? '',
      range.to ?? '',
    ] as const,
};

export const invalidateWeeklyRange = (range: Range = DEFAULT_RANGE) => {
  queryClient.invalidateQueries({ queryKey: reportKeys.weeklyRange(range) });
};

export const invalidateAllReports = () => {
  queryClient.invalidateQueries({ queryKey: reportKeys.all });
};

/* ── Range serialization ────────────────────────────── */

/** Build `?kind=...&from=...&to=...` while skipping empty optional params. */
export function rangeQueryString(range: Range): string {
  const params = new URLSearchParams();
  if (range.kind !== 'week' || range.from || range.to) {
    params.set('kind', range.kind);
  }
  if (range.from) params.set('from', range.from);
  if (range.to) params.set('to', range.to);
  const s = params.toString();
  return s ? `?${s}` : '';
}

/* ── Queries ────────────────────────────────────────── */

export const getWeeklyRangeQuery = (range: Range = DEFAULT_RANGE) => ({
  queryKey: reportKeys.weeklyRange(range),
  queryFn: async (): Promise<WeeklyReportResponse> => {
    try {
      return await api<WeeklyReportResponse>(
        `/api/reports/weekly${rangeQueryString(range)}`
      );
    } catch (err) {
      // 401/404 are user-state signals, not real errors — let React Query
      // treat them as "no data yet" instead of retrying forever.
      if (err instanceof ApiError && (err.status === 401 || err.status === 404)) {
        return { report: null, range: null };
      }
      throw err;
    }
  },
  // Don't retry on auth failures — auth context already knows.
  retry: (failureCount: number, error: unknown) => {
    const status = (error as { status?: number } | null)?.status;
    if (status === 401 || status === 403) return false;
    return failureCount < 1;
  },
});

/* ── Mutations ──────────────────────────────────────── */

export const regenerateWeeklyReportMutation = () => ({
  mutationFn: async () => {
    return api<{ ok: boolean; kind: string; weekStarting: string }>(
      '/api/reports/weekly/regenerate',
      { method: 'POST', body: { kind: 'week' } }
    );
  },
  onSuccess: () => {
    // Refresh only the week cache (other ranges won't have changed).
    queryClient.invalidateQueries({ queryKey: reportKeys.weeklyRange(DEFAULT_RANGE) });
  },
});

/* ── Helpers ────────────────────────────────────────── */

const CATEGORY_LABELS: Record<string, string> = {
  factual_statement: 'Factual statements',
  outdated_info: 'Outdated information',
  misleading_omission: 'Misleading omissions',
  manipulated_stat: 'Manipulated statistics',
  misattributed_quote: 'Misattributed quotes',
  satire_mistaken_as_real: 'Satire mistaken as real',
  survey_stat: 'Survey stats',
  conspiracy_theory: 'Conspiracy framings',
  misattributed_threat: 'Misattributed threats',
  unverified_claim: 'Unverified claims',
};

/** Human-friendly label for a category slug. Falls back to title-cased slug. */
export function categoryLabel(slug: string | null): string {
  if (!slug) return 'Unknown';
  return CATEGORY_LABELS[slug] ?? slug.replace(/_/g, ' ');
}

const RANGE_TITLES: Record<RangeKind, string> = {
  week: 'Your Week',
  month: 'Your Month',
  quarter: 'Your Quarter',
  custom: 'Your Custom Period',
};

/** Display title for the hero — used by the WeeklyReport page. */
export function rangeTitle(range: Range | null | undefined): string {
  if (!range) return RANGE_TITLES.week;
  return RANGE_TITLES[range.kind];
}

/** Headline for the hero — different verbs copy. */
export function rangeHeadline(range: Range | null | undefined): string {
  if (range?.kind === 'quarter') return 'in Truth.';
  return 'in Truth.';
}

/** Subhead copy varies subtly with the range. */
export function rangeSubhead(range: Range | null | undefined): string {
  switch (range?.kind) {
    case 'month':
      return 'A whole month of votes, one blind spot to find. We compare your accuracy to the global average across every claim you saw this month and surface the category that tripped you up most.';
    case 'quarter':
      return 'A full quarter of votes behind you. One number for how you did, the global average for context, the category that fooled you most, and one claim worth voting on again.';
    case 'custom':
      return 'A custom window of votes. We compare your accuracy to the global average across every claim you saw in the range you picked and surface the category that tripped you up most.';
    case 'week':
    default:
      return 'The pattern behind your mistakes. We compare every claim you voted on this week to the global average, find the category you tripped on most, and surface one claim worth a second look.';
  }
}
