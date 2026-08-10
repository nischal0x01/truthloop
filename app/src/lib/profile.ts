/**
 * Profile API + types — mirrors server/src/routes/users.ts.
 *
 * One composite call: GET /api/users/me/profile returns everything the
 * /profile page renders (user + stats + badges + recent activity + weekly
 * report). No client-side joins required.
 */

import { api } from './api';

/* ── Types ── */

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';
export type Verdict = 'real' | 'fake';

export interface ProfileUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  isAdmin: boolean;
  points: number;
  streakDays: number;
  createdAt: string;
}

export interface ProfileStats {
  totalVotes: number;
  correctVotes: number;
  accuracyPct: number;
  earnedBadges: number;
  totalBadges: number;
}

export interface ProfileBadge {
  slug: string;
  name: string;
  description: string;
  icon: string;
  rarity: Rarity;
  earnedAt: string | null;
}

export interface RecentVote {
  guessId: string;
  claimId: string;
  claimText: string;
  claimCategory: string;
  claimVerdict: Verdict;
  userAnswer: Verdict;
  isCorrect: boolean;
  createdAt: string;
}

export interface WeeklyReportPreview {
  weekStarting: string;
  totalGuesses: number;
  correctGuesses: number;
  blindSpotCategory: string | null;
  blindSpotNarrative: string | null;
  replayClaimId: string | null;
  globalAverageAccuracy: number | null;
  userAccuracy: number | null;
  createdAt: string;
}

export interface ProfilePayload {
  user: ProfileUser;
  stats: ProfileStats;
  badges: ProfileBadge[];
  recentActivity: RecentVote[];
  latestWeeklyReport: WeeklyReportPreview | null;
}

/* ── API ── */

export const profileApi = {
  me: () => api<ProfilePayload>('/api/users/me/profile'),
} as const;

/* ── Query keys ── */

export const profileKeys = {
  all: ['profile'] as const,
  me: () => [...profileKeys.all, 'me'] as const,
};

/* ── Helpers ── */

const RARITY_META: Record<Rarity, { label: string; bg: string; ink: string; ring: string }> = {
  common:    { label: 'Common',    bg: 'bg-muted',     ink: 'text-foreground',         ring: 'border-foreground/20' },
  rare:      { label: 'Rare',      bg: 'bg-accent',    ink: 'text-accent-foreground',  ring: 'border-accent' },
  epic:      { label: 'Epic',      bg: 'bg-highlight', ink: 'text-highlight-foreground', ring: 'border-highlight' },
  legendary: { label: 'Legendary', bg: 'bg-warning',   ink: 'text-warning-foreground', ring: 'border-warning' },
};

export function rarityMeta(rarity: Rarity) {
  return RARITY_META[rarity];
}

/** Human-friendly "member since" — e.g. "Aug 2026" or "Joined Aug 2026". */
export function memberSince(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    year: 'numeric',
  });
}

/** Truncate claim text for activity feed. */
export function truncate(text: string, limit = 100): string {
  return text.length <= limit ? text : `${text.slice(0, limit - 1).trimEnd()}…`;
}

/** ISO date → relative time. */
export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const diffSec = Math.max(1, Math.round((Date.now() - then) / 1000));
  if (diffSec < 60) return `${diffSec}s ago`;
  const m = Math.round(diffSec / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}