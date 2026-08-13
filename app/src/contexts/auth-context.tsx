/**
 * AuthProvider — single source of truth for "who is the current user?"
 *
 * Wraps the app at the top (alongside QueryClientProvider) and exposes
 * `useAuth()` with `{ user, status, error, signIn, signUp, signOut, isAuthenticated }`.
 *
 * State management:
 *   - `useQuery` driven by the `getMeQuery()` factory in actions/auth.ts
 *     is the canonical user cache.
 *   - sign-in / sign-up / sign-out mutations update that cache on success.
 *   - On first render we DON'T fetch /me — only after the app knows it
 *     might have a session (we always try, since cookies are auto-sent).
 *     401 is treated as "not signed in" and surfaces as `user: null`.
 *
 * Login redirects use `navigate()` (react-router) instead of full page reloads
 * so we keep React state (and the warm query cache) across the boundary.
 */

import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  getMeQuery,
  signInMutation,
  signUpMutation,
  signOutMutation,
  type SafeUser,
  type SignInInput,
  type SignUpInput,
} from '@/actions/auth';

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

/** Map any thrown error to a user-friendly string for form errors. */
function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  return fallback;
}

/* ── Provider ── */

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  /* ── Current-user query (factory from actions/auth.ts) ── */
  const meQuery = useQuery<SafeUser | null>(getMeQuery());

  /* ── Mutations (factories from actions/auth.ts) ── */
  const signInMut = useMutation<SafeUser, Error, SignInInput>(signInMutation());
  const signUpMut = useMutation<SafeUser, Error, SignUpInput>(signUpMutation());
  const signOutMut = useMutation<void, Error, void>(signOutMutation());

  /* ── Stable callbacks ── */

  const signIn = useCallback(
    async (input: SignInInput) => {
      try {
        return await signInMut.mutateAsync(input);
      } catch (err) {
        throw new Error(errorMessage(err, 'Sign-in failed. Please try again.'));
      }
    },
    [signInMut]
  );

  const signUp = useCallback(
    async (input: SignUpInput) => {
      try {
        return await signUpMut.mutateAsync(input);
      } catch (err) {
        throw new Error(errorMessage(err, 'Sign-up failed. Please try again.'));
      }
    },
    [signUpMut]
  );

  const signOut = useCallback(async () => {
    try {
      await signOutMut.mutateAsync();
    } catch {
      // Even if the server call fails we want the UI to act signed out —
      // we already cleared the cache in onSettled.
    }
  }, [signOutMut]);

  const refresh = useCallback(async () => meQuery.refetch().then((r) => r.data ?? null), [meQuery]);

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