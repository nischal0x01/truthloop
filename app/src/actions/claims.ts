/**
 * actions/claims.ts — Claims + votes action factories.
 *
 * Mirrors server endpoints in `server/src/routes/claims.ts`. Use by
 * `Feed.tsx` (list + myGuesses + vote) and any future claim-related pages.
 *
 * Centralised query keys via `claimKeys` keep cache invalidation
 * consistent across pages — when a vote succeeds, `invalidateAllClaimQueries`
 * is called so the feed list, per-user guesses, and auth user cache all
 * refresh in lockstep.
 */

import { ApiError, api } from '@/lib/api';
import { queryClient } from '@/providers';
import { invalidateAllAuthQueries } from './auth';

/* ── Types ── */

export type ClaimVerdict = 'real' | 'fake';

export type ClaimCategory =
  | 'factual_statement'
  | 'outdated_info'
  | 'misleading_omission'
  | 'manipulated_stat'
  | 'misattributed_quote'
  | 'satire_mistaken_as_real'
  | 'conspiracy_theory'
  | 'unverified_claim'
  | 'survey_stat'
  | 'misattributed_threat';

export interface Claim {
  id: string;
  text: string;
  verdict: ClaimVerdict;
  category: ClaimCategory;
  explanation: string;
  sourceUrl: string | null;
  isPublished: boolean;
  publishedAt: string | null;
  trendingScore: number;
  voteCount: number;
  /** Community vote breakdown — realCount + fakeCount = voteCount */
  realCount?: number;
  fakeCount?: number;
  createdAt: string;
}

export interface UserGuess {
  answer: ClaimVerdict;
  correct: boolean;
}
export type UserGuessMap = Record<string, UserGuess>;

export interface VoteResult {
  guess: {
    claimId: string;
    userAnswer: ClaimVerdict;
    isCorrect: boolean;
    createdAt: string;
  };
  correct: boolean;
  pointsAwarded: number;
  claim: Pick<Claim, 'id' | 'text' | 'verdict' | 'explanation' | 'sourceUrl' | 'category'>;
}

/* ── Query keys ── */

export const claimKeys = {
  all: ['claims'] as const,
  list: () => [...claimKeys.all, 'list'] as const,
  detail: (id: string) => [...claimKeys.all, 'detail', id] as const,
  myGuesses: () => [...claimKeys.all, 'me-guesses'] as const,
};

/** Invalidate every cache that depends on claim or vote data. */
export const invalidateAllClaimQueries = () => {
  queryClient.invalidateQueries({ queryKey: claimKeys.all });
  // User points / streak live on the auth /me cache and update after a vote.
  invalidateAllAuthQueries();
};

/* ── Queries ── */

export const getClaimsQuery = () => ({
  queryKey: claimKeys.list(),
  queryFn: async (): Promise<Claim[]> => {
    const { claims } = await api<{ claims: Claim[] }>('/api/claims');
    return claims;
  },
});

export const getClaimByIdQuery = (id: string) => ({
  queryKey: claimKeys.detail(id),
  queryFn: async (): Promise<Claim> => {
    const { claim } = await api<{ claim: Claim }>(`/api/claims/${id}`);
    return claim;
  },
});

export const getMyGuessesQuery = () => ({
  queryKey: claimKeys.myGuesses(),
  queryFn: async (): Promise<UserGuessMap> => {
    const { guesses } = await api<{ guesses: UserGuessMap }>(
      '/api/claims/me/guesses'
    );
    return guesses;
  },
  // Only the signed-in user has guesses. Disable on landing or after
  // sign-out so we don't get a noisy 401 in flight.
  enabled: true, // caller can override with `enabled: isAuthed` at use-site
});

/* ── Mutations ── */

export const voteClaimMutation = () => ({
  mutationFn: async ({
    claimId,
    answer,
  }: {
    claimId: string;
    answer: ClaimVerdict;
  }): Promise<VoteResult> => {
    return api<VoteResult>(`/api/claims/${claimId}/guess`, {
      method: 'POST',
      body: { user_answer: answer },
    });
  },
  // Server is the source of truth — refresh everything that depends on
  // votes or user points.
  onSuccess: () => {
    invalidateAllClaimQueries();
  },
});

/* ── Category metadata (label + icon + colour accent) ── */

export interface CategoryMeta {
  label: string;
  icon: string;
  /** Tailwind utility names — `bg-${bg}` `text-${ink}` `border-${bg}` */
  bg: string;
  ink: string;
}

export const CATEGORY_META: Record<ClaimCategory, CategoryMeta> = {
  factual_statement: {
    label: 'Factual claim',
    icon: '📋',
    bg: 'bg-accent',
    ink: 'text-accent-foreground',
  },
  outdated_info: {
    label: 'Outdated info',
    icon: '⏰',
    bg: 'bg-warning',
    ink: 'text-warning-foreground',
  },
  misleading_omission: {
    label: 'Missing context',
    icon: '🔍',
    bg: 'bg-highlight',
    ink: 'text-highlight-foreground',
  },
  manipulated_stat: {
    label: 'Manipulated stat',
    icon: '📊',
    bg: 'bg-danger',
    ink: 'text-danger-foreground',
  },
  misattributed_quote: {
    label: 'Misquoted',
    icon: '💬',
    bg: 'bg-secondary',
    ink: 'text-secondary-foreground',
  },
  satire_mistaken_as_real: {
    label: 'Satire',
    icon: '🎭',
    bg: 'bg-warning',
    ink: 'text-warning-foreground',
  },
  conspiracy_theory: {
    label: 'Conspiracy',
    icon: '👁️',
    bg: 'bg-danger',
    ink: 'text-danger-foreground',
  },
  unverified_claim: {
    label: 'Unverified',
    icon: '❓',
    bg: 'bg-muted',
    ink: 'text-foreground',
  },
  survey_stat: {
    label: 'Survey stat',
    icon: '📊',
    bg: 'bg-accent',
    ink: 'text-accent-foreground',
  },
  misattributed_threat: {
    label: 'Misattributed threat',
    icon: '⚠️',
    bg: 'bg-danger',
    ink: 'text-danger-foreground',
  },
};

/* ── Helpers ── */

const TRUNCATE_LIMIT = 280;
export function truncateClaim(text: string, limit = TRUNCATE_LIMIT): string {
  if (text.length <= limit) return text;
  return `${text.slice(0, limit - 1).trimEnd()}…`;
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffSec = Math.max(1, Math.round((now - then) / 1000));

  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(iso).toLocaleDateString();
}

/* Re-export ApiError so consumers don't have to import it separately. */
export { ApiError };