/**
 * actions/submissions.ts — /submit tab fetcher + mutation.
 *
 * Mirrors `routes/submissions.ts`. Two calls:
 *   1. `submitClaim({ text })` — POST + AI fact-check + persist + (+5 pts if under cap)
 *   2. `getMySubmissions(limit?)` — list the caller's recent submissions
 *
 * Cache strategy:
 *   - The mutation returns the new submission + the full FactCheck + points awarded.
 *   - On success, we prepend the new submission to the `mine` cache so the
 *     "Recent submissions" list updates instantly.
 *   - The caller's points (read off the auth-context `user.points`) is invalidated
 *     by the auth cache key so the TopNav coin reflects the new total on next render.
 */

import { api } from '@/lib/api';
import { queryClient } from '@/providers';

/* ── Types ── */

export type SubmissionVerdict = 'real' | 'fake' | 'unverified';

export interface SubmissionSource {
  url: string;
  title: string;
  snippet?: string;
}

export interface FactCheck {
  verdict: SubmissionVerdict;
  /** 0..100 — Claude's confidence in the verdict. */
  confidence: number;
  /** ≤2 sentences for the main verdict chip. */
  headline: string;
  /** 1–4 supporting reasons, each ≤30 words. */
  reasons: string[];
  /** 0–3 cited sources (real URLs only — never fabricated). */
  sources?: SubmissionSource[];
  /** Category slug matching the main claim feed. */
  category: string;
}

export interface Submission {
  id: string;
  text: string;
  aiVerdict: SubmissionVerdict | null;
  aiConfidence: number | null;
  aiExplanation: string | null;
  aiSources: SubmissionSource[] | null;
  aiCategory: string | null;
  createdAt: string;
}

export interface SubmitResponse {
  submission: Submission;
  factCheck: FactCheck;
  pointsAwarded: number;
}

/** Server-side envelope shape — `getMySubmissions` strips `.submissions`. */
export interface MySubmissionsResponse {
  submissions: Submission[];
}

/* ── Query keys ── */

export const submissionKeys = {
  all: ['submissions'] as const,
  mine: (limit: number) => [...submissionKeys.all, 'mine', limit] as const,
};

/* ── Queries ── */

export async function getMySubmissions(limit = 20): Promise<Submission[]> {
  const res = await api<MySubmissionsResponse>('/api/submissions/me', {
    query: { limit },
  });
  return res.submissions;
}

/* ── Mutations ── */

export interface SubmitInput {
  text: string;
}

export async function submitClaim(input: SubmitInput): Promise<SubmitResponse> {
  return api<SubmitResponse>('/api/submissions', {
    method: 'POST',
    body: input,
  });
}

/* ── Cache helpers ── */

/**
 * After a successful submit, prepend the new submission to every `mine` cache
 * variant so the "Recent submissions" list reflects the new entry without a
 * refetch. Also invalidate the auth cache so the points display refreshes.
 *
 * The cache stores `Submission[]` directly — `getMySubmissions()` unwraps the
 * server's `{ submissions: [...] }` envelope before returning, so TanStack
 * Query caches that array, not the wrapper.
 */
export function applySubmissionToCache(submission: Submission) {
  queryClient.setQueriesData<Submission[]>(
    { queryKey: [...submissionKeys.all, 'mine'] },
    (old) => {
      if (!old) return [submission];
      // Avoid duplicates if the user double-submits the same text fast.
      if (old.some((s) => s.id === submission.id)) return old;
      return [submission, ...old];
    }
  );

  // The server awarded points; the auth-context cache (`/api/auth/me`) drives
  // the TopNav coin, so invalidate it so the next render reflects the new total.
  queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
}
