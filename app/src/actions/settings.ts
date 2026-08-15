/**
 * actions/settings.ts — current user's email + notification preferences.
 *
 *   GET /api/me/settings        → { settings: {...} }
 *   PUT /api/me/settings        → { settings: {...} }  (partial update)
 *
 * Query keys: `['settings', 'me']`.
 */

import { api, ApiError } from '@/lib/api';
import { queryClient } from '@/providers';

/* ── Types ── */

export interface MySettings {
  emailDigestEnabled: boolean;
  emailInstantAlertsEnabled: boolean;
  emailDigestHourLocal: number;
  timezone: string;
}

export interface MySettingsResponse {
  settings: MySettings;
}

/* ── Query keys ── */

export const settingsKeys = {
  all: ['settings'] as const,
  me: () => [...settingsKeys.all, 'me'] as const,
};

export const invalidateSettings = () => {
  queryClient.invalidateQueries({ queryKey: settingsKeys.all });
};

/* ── Queries ── */

export const getMySettingsQuery = () => ({
  queryKey: settingsKeys.me(),
  queryFn: async (): Promise<MySettings> => {
    try {
      const res = await api<MySettingsResponse>('/api/me/settings');
      return res.settings;
    } catch (err) {
      // 401 = signed out — let auth context handle it; return a sane
      // default so the Settings page can render the disabled state.
      if (err instanceof ApiError && err.status === 401) {
        return {
          emailDigestEnabled: true,
          emailInstantAlertsEnabled: true,
          emailDigestHourLocal: 8,
          timezone: 'UTC',
        };
      }
      throw err;
    }
  },
  staleTime: 30_000,
  retry: (failureCount: number, error: unknown) => {
    const status = (error as { status?: number } | null)?.status;
    if (status === 401 || status === 403) return false;
    return failureCount < 1;
  },
});

/* ── Mutations ── */

export type SettingsPatch = Partial<MySettings>;

export const updateMySettingsMutation = () => ({
  mutationFn: async (patch: SettingsPatch): Promise<MySettings> => {
    const res = await api<MySettingsResponse>('/api/me/settings', {
      method: 'PUT',
      body: patch,
    });
    return res.settings;
  },
});

/**
 * Reconcile the settings cache after a successful save.
 *
 * Callers MUST invoke this from their mutation's `onSuccess` rather than
 * relying on a factory-spread `onSuccess` — a user-supplied onSuccess
 * silently overrides the factory's, and the cache write never happens.
 * Without this, the page's "dirty" check would never flip false because
 * `draft` (set to the server response) diverges from `settingsQuery.data`
 * (still the old pre-save value).
 */
export function applySettingsToCache(settings: MySettings) {
  queryClient.setQueryData(settingsKeys.me(), settings);
}

/* ── Live "Email me this report" action ── */

export interface SendWeeklyReportEmailResponse {
  sent: true;
  email: string;
  dryRun: boolean;
}

export const sendWeeklyReportEmailMutation = () => ({
  mutationFn: async (): Promise<SendWeeklyReportEmailResponse> => {
    return api<SendWeeklyReportEmailResponse>('/api/reports/weekly/email', {
      method: 'POST',
    });
  },
});