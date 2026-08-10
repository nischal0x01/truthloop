/**
 * Claims API + types — mirrors server/src/routes/claims.ts and the
 * `claims` table in server/src/db/schema.sql.
 *
 * Exports:
 *   - Claim, ClaimVerdict, ClaimCategory types
 *   - UserGuess map type
 *   - claimsApi.{list, get, myGuesses, vote}
 *   - CATEGORY_META — readable labels, icons, and colour accents
 *   - claimKeys — query keys for TanStack Query cache management
 */

import { api } from './api';

/* ── Types ── */

export type ClaimVerdict = 'real' | 'fake';

export type ClaimCategory =
  | 'factual_statement'
  | 'outdated_info'
  | 'misleading_omission'
  | 'manipulated_stat'
  | 'misattributed_quote'
  | 'satire_mistaken_as_real'
  | 'survey_stat'
  | 'conspiracy_theory'
  | 'misattributed_threat'
  | 'unverified_claim';

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

/* ── API ── */

export const claimsApi = {
  list: () => api<{ claims: Claim[] }>('/api/claims'),

  get: (id: string) => api<{ claim: Claim }>(`/api/claims/${id}`),

  myGuesses: () =>
    api<{ guesses: UserGuessMap }>('/api/claims/me/guesses'),

  vote: (claimId: string, userAnswer: ClaimVerdict) =>
    api<VoteResult>(`/api/claims/${claimId}/guess`, {
      method: 'POST',
      body: { user_answer: userAnswer },
    }),
} as const;

/* ── TanStack Query keys ── */

export const claimKeys = {
  all: ['claims'] as const,
  list: () => [...claimKeys.all, 'list'] as const,
  detail: (id: string) => [...claimKeys.all, 'detail', id] as const,
  myGuesses: () => [...claimKeys.all, 'me-guesses'] as const,
};

/* ── Category metadata (label + icon + colour accent) ── */

export interface CategoryMeta {
  label: string;
  icon: string;
  /** Tailwind utility names — `bg-${bg}` `text-${ink}` `border-${bg}` */
  bg: string;
  ink: string;
}

export const CATEGORY_META: Record<ClaimCategory, CategoryMeta> = {
  factual_statement:      { label: 'Factual claim',       icon: '📋', bg: 'bg-accent',     ink: 'text-accent-foreground' },
  outdated_info:          { label: 'Outdated info',       icon: '⏰', bg: 'bg-warning',    ink: 'text-warning-foreground' },
  misleading_omission:    { label: 'Missing context',     icon: '🔍', bg: 'bg-highlight',  ink: 'text-highlight-foreground' },
  manipulated_stat:       { label: 'Manipulated stat',    icon: '📊', bg: 'bg-danger',     ink: 'text-danger-foreground' },
  misattributed_quote:    { label: 'Wrong quote',         icon: '💬', bg: 'bg-highlight',  ink: 'text-highlight-foreground' },
  satire_mistaken_as_real:{ label: 'Satire',              icon: '🎭', bg: 'bg-warning',    ink: 'text-warning-foreground' },
  survey_stat:            { label: 'Survey stat',         icon: '📈', bg: 'bg-accent',     ink: 'text-accent-foreground' },
  conspiracy_theory:      { label: 'Conspiracy',          icon: '👁️', bg: 'bg-danger',     ink: 'text-danger-foreground' },
  misattributed_threat:   { label: 'Misattributed',       icon: '⚠️', bg: 'bg-danger',     ink: 'text-danger-foreground' },
  unverified_claim:       { label: 'Unverified',          icon: '❓', bg: 'bg-muted',      ink: 'text-foreground' },
};

/* ── Truncate claim text for feed previews (~280 chars) ── */

const TRUNCATE_LIMIT = 280;
export function truncateClaim(text: string, limit = TRUNCATE_LIMIT): string {
  if (text.length <= limit) return text;
  return `${text.slice(0, limit - 1).trimEnd()}…`;
}

/* ── Relative time helper (no extra deps) ── */

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