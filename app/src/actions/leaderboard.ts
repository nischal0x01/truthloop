/**
 * actions/leaderboard.ts — Leaderboard data for daily + all-time + user rank + activity.
 *
 * API endpoints:
 *   GET /api/leaderboard/daily
 *   GET /api/leaderboard/all-time
 *   GET /api/leaderboard/me
 *   GET /api/leaderboard/activity
 */
import { api } from '@/lib/api';
import { queryClient } from '@/providers';

/* ── Types (mirror the component prop interfaces) ── */

export interface LeaderboardEntry {
  rank: number;
  name: string;
  avatar: string | null;
  points: number;
  streak?: number;
  badges?: number;
  isCurrentUser?: boolean;
}

export interface DailyLeaderboardPayload {
  entries: LeaderboardEntry[];
  userRank: number | null;
  scope: 'daily';
}

export interface AllTimeLeaderboardPayload {
  entries: LeaderboardEntry[];
  userRank: number | null;
  scope: 'all-time';
}

export interface UserRankPayload {
  dailyRank: number | null;
  allTimeRank: number;
  totalGuesses: number;
  accuracy: number;
}

export interface ActivityEntry {
  id: string;
  user: string;
  action: 'voted on' | 'earned badge';
  target: string;
  correct: boolean | null;
  time: string;
}

export interface ActivityPayload {
  entries: ActivityEntry[];
}

export interface MilestonesPayload {
  nextRank: {
    targetRank: number;
    pointsNeeded: number;
    currentPoints: number;
  } | null;
  nextBadge: {
    slug: string;
    name: string;
    icon: string;
    rarity: string;
    pointsNeeded: number;
  } | null;
  userDailyPoints: number;
  userRank: number;
}

/* ── Query keys ── */

export const leaderboardKeys = {
  all: ['leaderboard'] as const,
  daily: () => [...leaderboardKeys.all, 'daily'] as const,
  allTime: () => [...leaderboardKeys.all, 'all-time'] as const,
  me: () => [...leaderboardKeys.all, 'me'] as const,
  activity: () => [...leaderboardKeys.all, 'activity'] as const,
  milestones: () => [...leaderboardKeys.all, 'milestones'] as const,
};

export const invalidateLeaderboard = () => {
  queryClient.invalidateQueries({ queryKey: leaderboardKeys.all });
};

export const invalidateDailyLeaderboard = () => {
  queryClient.invalidateQueries({ queryKey: leaderboardKeys.daily() });
};

/* ── Queries ── */

export const getDailyLeaderboardQuery = () => ({
  queryKey: leaderboardKeys.daily(),
  queryFn: async (): Promise<DailyLeaderboardPayload> => {
    return api<DailyLeaderboardPayload>('/api/leaderboard/daily');
  },
  staleTime: 30_000,
});

export const getAllTimeLeaderboardQuery = () => ({
  queryKey: leaderboardKeys.allTime(),
  queryFn: async (): Promise<AllTimeLeaderboardPayload> => {
    return api<AllTimeLeaderboardPayload>('/api/leaderboard/all-time');
  },
  staleTime: 60_000,
});

export const getUserRankQuery = () => ({
  queryKey: leaderboardKeys.me(),
  queryFn: async (): Promise<UserRankPayload> => {
    return api<UserRankPayload>('/api/leaderboard/me');
  },
  staleTime: 30_000,
});

export const getActivityQuery = () => ({
  queryKey: leaderboardKeys.activity(),
  queryFn: async (): Promise<ActivityPayload> => {
    return api<ActivityPayload>('/api/leaderboard/activity');
  },
  staleTime: 15_000,
});

export const getMilestonesQuery = () => ({
  queryKey: leaderboardKeys.milestones(),
  queryFn: async (): Promise<MilestonesPayload> => {
    return api<MilestonesPayload>('/api/leaderboard/milestones');
  },
  staleTime: 60_000,
});
