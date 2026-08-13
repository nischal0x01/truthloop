/**
 * actions/auth.ts — Auth API action factories.
 *
 * Mirrors server endpoints in `server/src/routes/auth.ts`. Each function
 * returns a plain object that gets spread into `useQuery({ ...factory })` or
 * `useMutation({ ...factory })` at the call site — keeping the data-fetching
 * logic in one place and the React hooks in the components.
 *
 * Returns shape `{ user: SafeUser }` mirrors the server response.
 *
 * 401 on `/api/auth/me` is treated as "not signed in" by `getMeQuery`:
 * it uses `fetchRaw` to inspect the status and returns `null` instead of
 * throwing. All other auth endpoints throw `ApiError` on failure.
 */

import { ApiError, api, fetchRaw } from '@/lib/api';
import { queryClient } from '@/providers';

/* ── Types ── */

export interface SafeUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  points: number;
  isAdmin: boolean;
}

export interface SignUpInput {
  name: string;
  email: string;
  password: string;
}

export interface SignInInput {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: SafeUser;
}

export interface SignOutResponse {
  ok: true;
}

/** Used by the Google button — server handles consent + redirect. */
export const googleOAuthUrl = () => {
  const base =
    (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000';
  return `${base}/api/auth/google`;
};

/* ── Query keys ── */

export const authKeys = {
  all: ['auth'] as const,
  me: () => [...authKeys.all, 'me'] as const,
};

/* ── Queries ── */

/**
 * GET /api/auth/me — returns the current user or `null` if signed out.
 *
 * Uses `fetchRaw` so we can swallow 401 and return `null` instead of throwing.
 * That keeps the auth context's status derivation (`loading` → `authenticated`
 * | `unauthenticated`) free of error-state noise on a fresh visit.
 */
export const getMeQuery = () => ({
  queryKey: authKeys.me(),
  queryFn: async (): Promise<SafeUser | null> => {
    const res = await fetchRaw('/api/auth/me');
    if (res.status === 401) return null;
    if (!res.ok) throw new ApiError(`Request failed (${res.status})`, res.status, null);
    const data = (await res.json()) as AuthResponse;
    return data.user;
  },
  // Cookies are auto-sent, so always enabled. UI must not "forget" the user
  // between renders.
  staleTime: 60_000,
  retry: false,
});

/* ── Mutations ── */

export const signInMutation = () => ({
  mutationFn: async (input: SignInInput): Promise<SafeUser> => {
    const { user } = await api<AuthResponse>('/api/auth/signin', {
      method: 'POST',
      body: input,
    });
    return user;
  },
  onSuccess: (user: SafeUser) => {
    queryClient.setQueryData(authKeys.me(), user);
  },
});

export const signUpMutation = () => ({
  mutationFn: async (input: SignUpInput): Promise<SafeUser> => {
    const { user } = await api<AuthResponse>('/api/auth/signup', {
      method: 'POST',
      body: input,
    });
    return user;
  },
  onSuccess: (user: SafeUser) => {
    queryClient.setQueryData(authKeys.me(), user);
  },
});

export const signOutMutation = () => ({
  mutationFn: async (): Promise<SignOutResponse> => {
    return api<SignOutResponse>('/api/auth/signout', { method: 'POST' });
  },
  // Always clear the cache — sign-out succeeded or failed, the local session
  // is gone either way.
  onSettled: () => {
    queryClient.setQueryData(authKeys.me(), null);
    queryClient.invalidateQueries();
  },
});

/* ── Invalidate helpers (used by other actions after auth changes) ── */

export const invalidateAllAuthQueries = () => {
  queryClient.invalidateQueries({ queryKey: authKeys.all });
};