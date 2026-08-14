/**
 * actions/forecasts.ts — Scam Forecast fetcher + mutations for /forecast.
 *
 * Mirrors server `routes/forecast.ts`. Same cache-first strategy as
 * `actions/discussions.ts`: mutations write directly to the relevant query
 * cache via `setQueryData` so the UI reflects the new tally without waiting
 * for a refetch round-trip.
 *
 * Vote semantics:
 *   - One vote per user per item. Sending a new vote overwrites the previous one.
 *   - There is no "clear vote" endpoint — the spec only has believe / doubt / skip.
 *   - The server recomputes tally counts from the `forecast_votes` table on every
 *     write, so client-side arithmetic is unreliable. We just trust the response
 *     and write the entire updated item back into the cache.
 */

import { api } from '@/lib/api';
import { queryClient } from '@/providers';

/* ── Types (mirror server `ForecastOut` / `ForecastItemOut`) ── */

export type ForecastSeverity = 'low' | 'medium' | 'high';
export type ForecastVoteValue = 'believe' | 'doubt' | 'skip';

export interface ForecastItem {
  id: string;
  severity: ForecastSeverity;
  category: string;
  title: string;
  summary: string;
  recommendedAction: string | null;
  region: string | null;
  /** Verbatim URL of the <search_results> entry this forecast was grounded in. */
  sourceUrl: string | null;
  /** Verbatim title of that entry. */
  sourceTitle: string | null;
  believeCount: number;
  doubtCount: number;
  skipCount: number;
  myVote: ForecastVoteValue | null;
  createdAt: string;
}

export interface Forecast {
  id: string;
  date: string;
  generatedAt: string;
  generationStatus: 'success' | 'fallback' | 'failed';
  items: ForecastItem[];
}

export interface ForecastTodayResponse {
  forecast: Forecast;
}

export interface ForecastHistoryResponse {
  forecasts: Forecast[];
}

export interface VoteResponse {
  item: {
    id: string;
    myVote: ForecastVoteValue;
    believeCount: number;
    doubtCount: number;
    skipCount: number;
  };
}

/* ── Query keys ── */

export const forecastKeys = {
  all: ['forecasts'] as const,
  today: () => [...forecastKeys.all, 'today'] as const,
  history: (days: number) => [...forecastKeys.all, 'history', days] as const,
};

/* ── Queries ── */

export async function fetchTodayForecast(): Promise<Forecast> {
  const res = await api<ForecastTodayResponse>('/api/forecast/today');
  return res.forecast;
}

export async function fetchForecastHistory(days = 3): Promise<Forecast[]> {
  const res = await api<ForecastHistoryResponse>('/api/forecast/history', {
    query: { days },
  });
  return res.forecasts;
}

/* ── Mutations ── */

/** Cast a vote on a forecast item. Overwrites any previous vote. */
export async function voteOnForecastItem(
  itemId: string,
  vote: ForecastVoteValue
): Promise<VoteResponse['item']> {
  const res = await api<VoteResponse>(`/api/forecast/${itemId}/vote`, {
    method: 'POST',
    body: { vote },
  });
  return res.item;
}

/** Manually trigger today's forecast generation (admin / demo). */
export async function regenerateForecast(): Promise<Forecast> {
  const res = await api<ForecastTodayResponse>('/api/forecast/generate', {
    method: 'POST',
  });
  // Update both caches so any open /forecast view picks up the new items.
  queryClient.setQueryData(forecastKeys.today(), res.forecast);
  // History includes today at index 0 — patch that variant if it's in cache.
  queryClient.setQueriesData<ForecastHistoryResponse>(
    { queryKey: [...forecastKeys.all, 'history'] },
    (old) => {
      if (!old) return old;
      const idx = old.forecasts.findIndex((f) => f.date === res.forecast.date);
      if (idx === -1) return { forecasts: [res.forecast, ...old.forecasts] };
      const next = old.forecasts.slice();
      next[idx] = res.forecast;
      return { forecasts: next };
    }
  );
  return res.forecast;
}

/* ── Cache write helpers ── */

/**
 * After a vote mutation, patch the matching item in every cached query
 * (today + history). Mirrors the discussion `updateAllListCaches` pattern.
 */
export function applyVoteToCache(item: VoteResponse['item']) {
  const updater = (old: Forecast | undefined): Forecast | undefined => {
    if (!old) return old;
    const nextItems = old.items.map((it) =>
      it.id === item.id
        ? {
            ...it,
            myVote: item.myVote,
            believeCount: item.believeCount,
            doubtCount: item.doubtCount,
            skipCount: item.skipCount,
          }
        : it
    );
    return { ...old, items: nextItems };
  };

  queryClient.setQueryData<Forecast>(forecastKeys.today(), updater);
  queryClient.setQueriesData<Forecast>(
    { queryKey: [...forecastKeys.all, 'history'] },
    updater
  );
}
