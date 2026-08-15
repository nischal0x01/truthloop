/**
 * actions/leaderboard.ts — Leaderboard API action factories.
 *
 * Mirrors server endpoints in `server/src/routes/leaderboard.ts`. The
 * daily + all-time boards share a single endpoint with a `scope` query
 * param; the two factories here let components opt into parallel queries
 * via TanStack Query without managing query keys by hand.
 *
 * Each factory returns a plain object spread into `useQuery({ ...factory })`
 * at the call site.
 */

import { api } from '@/lib/api';

/* ── Types ── */

export type LeaderboardScope = 'daily' | 'all-time';

export interface LeaderboardEntry {
  id: string;
  rank: number;
  displayName: string;
  avatarUrl: string | null;
  points: number;
  badges: number;
  streakDays: number;
}

export interface CallerStats {
  totalVotes: number;
  correctVotes: number;
  accuracyPct: number;
  streakDays: number;
}

export interface LeaderboardResponse {
  scope: LeaderboardScope;
  entries: LeaderboardEntry[];
  /** null when not signed in OR when the caller has no points in this scope. */
  yourRank: number | null;
  yourPoints: number | null;
  /** null when not signed in. */
  yourStats: CallerStats | null;
}

/* ── Query keys ── */

export const leaderboardKeys = {
  all: ['leaderboard'] as const,
  scope: (scope: LeaderboardScope) => [...leaderboardKeys.all, scope] as const,
};

/* ── Queries ── */

export const getLeaderboardQuery = (scope: LeaderboardScope) => ({
  queryKey: leaderboardKeys.scope(scope),
  queryFn: async (): Promise<LeaderboardResponse> => {
    return api<LeaderboardResponse>(`/api/leaderboard?scope=${scope}`);
  },
  // Refetch every 60s so a vote on /claims shows up on /leaderboard
  // without the user clicking refresh — matches the rest of the app's
  // polling fallback for the cut-SSE real-time path.
  staleTime: 30_000,
  refetchInterval: 60_000,
});
