/**
 * ProtectedRoute — gates a route on `useAuth().isAuthenticated`.
 *
 * Usage:
 *   <Route element={<ProtectedRoute />}>
 *     <Route path="/dashboard" element={<Dashboard />} />
 *   </Route>
 *
 * Behaviour:
 *   - While `status === 'loading'`: render a full-page loader (no flicker).
 *   - When `status === 'unauthenticated'`: <Navigate /> to /signin with
 *     the `from` location in state so we can bounce back after login.
 *   - When `status === 'authenticated'`: render <Outlet />.
 */

import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <div
        role="status"
        aria-label="Checking your session"
        className="min-h-screen w-full grid place-items-center bg-background text-foreground"
      >
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/signin" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}