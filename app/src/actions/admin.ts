/**
 * actions/admin.ts — admin-only actions.
 *
 * Mirrors server endpoints in `server/src/routes/admin.ts`. All actions
 * here are guarded server-side by `req.user.isAdmin === true`; the UI
 * also gates them by `user?.isAdmin` so non-admin users never see the
 * trigger.
 *
 * Each function returns a plain object that gets spread into
 * `useQuery({ ...factory })` or `useMutation({ ...factory })` at the
 * call site.
 */

import { api } from '@/lib/api';
import { queryClient } from '@/providers';
import { claimKeys } from './claims';

/* ── Types ── */

/**
 * The claim-harvester summary returned by POST /api/admin/harvest.
 * Mirrors `ClaimHarvestSummary` in
 * `server/src/jobs/claimHarvester.ts`.
 */
export interface ClaimHarvestSummary {
  today: string;
  searchHits: number;
  aiItems: number;
  droppedUnverified: number;
  droppedDuplicate: number;
  inserted: number;
  durationMs: number;
}

/* ── Mutations ── */

/**
 * Manually run one pass of the hourly claim-harvester cron.
 * On success, invalidate the claims list cache so any newly-inserted
 * rows appear in the feed without a full page reload.
 */
export const runHarvestMutation = () => ({
  mutationFn: async (): Promise<ClaimHarvestSummary> => {
    const { summary } = await api<{ ok: true; summary: ClaimHarvestSummary }>(
      '/api/admin/harvest',
      { method: 'POST' }
    );
    return summary;
  },
  onSuccess: () => {
    // New auto-ingested claims should appear in the feed immediately.
    queryClient.invalidateQueries({ queryKey: claimKeys.list() });
  },
});
