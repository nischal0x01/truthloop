/**
 * providers.tsx — global QueryClient + provider wrapper.
 *
 * The `queryClient` is a module-level singleton, NOT created inside the
 * component. That lets action factories (in `src/actions/*`) import it and
 * call `queryClient.invalidateQueries({ ... })` from outside React — e.g.
 * inside a mutation's `onSuccess` defined in an action file. Without this,
 * every action would need a React hook to drive invalidation.
 *
 * Defaults:
 *   - staleTime 30s: queries are fresh for 30s, so navigating between pages
 *     doesn't trigger a refetch.
 *   - retry 1: one retry on transient failures, then surface the error.
 *   - refetchOnWindowFocus: refresh when the user returns to the tab.
 *
 * Auth-gated queries (`/api/auth/me`, `/api/users/me/profile`,
 * `/api/claims/me/guesses`) override these per-query with `enabled` and
 * `retry: false` so they don't retry on 401 or fire after sign-out.
 */

import { type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
});

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}