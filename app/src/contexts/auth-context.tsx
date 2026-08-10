/**
 * AuthProvider — single source of truth for "who is the current user?"
 *
 * Wraps the app at the top (alongside QueryClientProvider) and exposes
 * `useAuth()` with `{ user, status, error, signIn, signUp, signOut, isAuthenticated }`.
 *
 * State management:
 *   - `useQuery(['auth', 'me'])` is the canonical user cache.
 *   - sign-in / sign-up / sign-out mutations update that cache on success.
 *   - On first render we DON'T fetch /me — only after the app knows it
 *     might have a session (we always try, since cookies are auto-sent).
 *     401 is treated as "not signed in" and surfaces as `user: null`.
 *
 * Login redirects use `navigate()` (react-router) instead of full page reloads
 * so we keep React state (and the warm query cache) across the boundary.
 */

import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@/lib/api';
import {
  authApi,
  type SafeUser,
  type SignInInput,
  type SignUpInput,
} from '@/lib/auth';

/* ── Query keys (centralised so cache invalidation stays consistent) ── */

export const authKeys = {
  me: ['auth', 'me'] as const,
};

/* ── Public shape ── */

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthContextValue {
  user: SafeUser | null;
  status: AuthStatus;
  error: Error | null;
  isAuthenticated: boolean;
  signIn: (input: SignInInput) => Promise<SafeUser>;
  signUp: (input: SignUpInput) => Promise<SafeUser>;
  signOut: () => Promise<void>;
  refresh: () => Promise<SafeUser | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/* ── Helpers ── */

function isUnauthorized(err: unknown): boolean {
  return err instanceof ApiError && err.status === 401;
}

/** Map any thrown error to a user-friendly string for form errors. */
function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}

/* ── Provider ── */

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const qc = useQueryClient();

  /* ── Current-user query ── */
  // Always enabled: cookies are auto-sent, and a 401 just resolves to null.
  // We never want the UI to "forget" the user between renders.
  const meQuery = useQuery<SafeUser | null>({
    queryKey: authKeys.me,
    queryFn: async () => {
      try {
        const { user } = await authApi.me();
        return user;
      } catch (err) {
        if (isUnauthorized(err)) return null;
        throw err;
      }
    },
    staleTime: 60_000, // 1 min — revalidate on focus / window-blur anyway
    retry: false,
  });

  /* ── Mutations ── */

  const signInMutation = useMutation<SafeUser, Error, SignInInput>({
    mutationFn: async (input) => {
      const { user } = await authApi.signIn(input);
      return user;
    },
    onSuccess: (user) => {
      qc.setQueryData(authKeys.me, user);
    },
  });

  const signUpMutation = useMutation<SafeUser, Error, SignUpInput>({
    mutationFn: async (input) => {
      const { user } = await authApi.signUp(input);
      return user;
    },
    onSuccess: (user) => {
      qc.setQueryData(authKeys.me, user);
    },
  });

  const signOutMutation = useMutation<void, Error, void>({
    mutationFn: async () => {
      await authApi.signOut();
    },
    onSettled: () => {
      // Always clear the cache — sign-out succeeded or failed, the local
      // session is gone either way.
      qc.setQueryData(authKeys.me, null);
      qc.invalidateQueries();
    },
  });

  /* ── Stable callbacks ── */

  const signIn = useCallback(
    async (input: SignInInput) => {
      try {
        return await signInMutation.mutateAsync(input);
      } catch (err) {
        throw new Error(errorMessage(err, 'Sign-in failed. Please try again.'));
      }
    },
    [signInMutation]
  );

  const signUp = useCallback(
    async (input: SignUpInput) => {
      try {
        return await signUpMutation.mutateAsync(input);
      } catch (err) {
        throw new Error(errorMessage(err, 'Sign-up failed. Please try again.'));
      }
    },
    [signUpMutation]
  );

  const signOut = useCallback(async () => {
    try {
      await signOutMutation.mutateAsync();
    } catch {
      // Even if the server call fails we want the UI to act signed out —
      // we already cleared the cache in onSettled.
    }
  }, [signOutMutation]);

  const refresh = useCallback(async () => {
    const result = await qc.fetchQuery({
      queryKey: authKeys.me,
      queryFn: async () => {
        try {
          const { user } = await authApi.me();
          return user;
        } catch (err) {
          if (isUnauthorized(err)) return null;
          throw err;
        }
      },
    });
    return result;
  }, [qc]);

  /* ── Derived status ── */

  const status: AuthStatus = meQuery.isLoading
    ? 'loading'
    : meQuery.data
      ? 'authenticated'
      : 'unauthenticated';

  const value = useMemo<AuthContextValue>(
    () => ({
      user: meQuery.data ?? null,
      status,
      error: meQuery.error instanceof Error ? meQuery.error : null,
      isAuthenticated: status === 'authenticated',
      signIn,
      signUp,
      signOut,
      refresh,
    }),
    [meQuery.data, meQuery.error, status, signIn, signUp, signOut, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/* ── Hook ── */

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>.');
  }
  return ctx;
}