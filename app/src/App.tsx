/**
 * App — top-level router + global providers.
 *
 * Provider order (outer → inner):
 *   - AuthProvider      → owns the `useAuth()` cache; reads /api/auth/me on mount.
 *   - <BrowserRouter>   → enables react-router hooks in every component below.
 *   - <Routes>          → renders the active page.
 *
 * Route map:
 *   /              → Landing (unauthenticated) or redirect to /claims
 *   /claims        → Feed (authenticated) — the main app view after login
 *   /claims/:id    → Feed with that claim open in the detail panel
 *   /signin        → public auth form (redirects authenticated users to /claims)
 *   /signup        → public auth form (redirects authenticated users to /claims)
 *   /dashboard     → legacy alias → /profile
 *   /feed/*        → legacy alias → / (collapses to landing or /claims)
 *   *              → catch-all → /
 */

import { BrowserRouter, Routes, Route, Navigate, useParams, useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Nav } from '@/components/landing/nav';
import { Hero } from '@/components/landing/hero';
import { WhyTruthLoop } from '@/components/landing/why-truthloop';
import { LoopSteps } from '@/components/landing/loop-steps';
import { BlindSpot } from '@/components/landing/blind-spot';
import { Forecast } from '@/components/landing/forecast';
import { LeaderboardPreview } from '@/components/landing/leaderboard-preview';
import { CTA } from '@/components/landing/cta';
import { Footer } from '@/components/landing/footer';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AuthProvider, useAuth } from '@/contexts/auth-context';
import { SignIn } from '@/pages/SignIn';
import { SignUp } from '@/pages/SignUp';
import { Profile } from '@/pages/Profile';
import { Feed } from '@/pages/Feed';
import { Leaderboard } from '@/pages/Leaderboard';
import { Discussions } from '@/pages/Discussions';

/* ── Landing (marketing) ── */

const Landing = () => (
  <div className="grain-overlay min-h-screen bg-background text-foreground">
    <Nav />
    <main>
      <Hero />
      <WhyTruthLoop />
      <LoopSteps />
      <BlindSpot />
      <Forecast />
      <LeaderboardPreview />
      <CTA />
    </main>
    <Footer />
  </div>
);

/* ── Root route: Landing if signed out, redirect to /claims if signed in ── */

function RootRoute() {
  const { status } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // All hooks must be called unconditionally and in the same order every render
  useEffect(() => {
    if (status === 'authenticated') {
      navigate(`/claims${location.search}`, { replace: true });
    }
  }, [status, navigate, location.search]);

  if (status === 'loading') {
    return (
      <div
        role="status"
        aria-label="Loading"
        className="min-h-screen w-full grid place-items-center bg-background text-foreground"
      >
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (status === 'authenticated') {
    return null;
  }

  return <Landing />;
}

/** /claims — authenticated feed view */
function ClaimsRoute({ claimId }: { claimId?: string }) {
  const { status } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (status === 'loading') {
    return (
      <div
        role="status"
        aria-label="Loading"
        className="min-h-screen w-full grid place-items-center bg-background text-foreground"
      >
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return <Navigate to="/signin" replace />;
  }

  // Post-OAuth redirect destination (set by ProtectedRoute before redirecting to signin)
  useEffect(() => {
    const redirectTo = sessionStorage.getItem('authRedirectTo');
    if (redirectTo) {
      sessionStorage.removeItem('authRedirectTo');
      navigate(redirectTo, { replace: true });
    }
  }, [navigate]);

  return <Feed initialSearch={location.search} selectedClaimId={claimId} />;
}

/** /claims/:id — feed with claim open in detail panel */
function ClaimDetailRoute() {
  const { id } = useParams<{ id: string }>();
  return <ClaimsRoute claimId={id} />;
}

/**
 * Bounce signed-in users away from /signin or /signup — they have no business
 * there. Keeps the landing flow clean.
 */
function RedirectIfSignedIn({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  if (status === 'authenticated') return <Navigate to="/claims" replace />;
  return <>{children}</>;
}

const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Root — adaptive */}
          <Route path="/" element={<RootRoute />} />

          {/* Main app routes */}
          <Route path="/claims" element={<ClaimsRoute />} />
          <Route path="/claims/:id" element={<ClaimDetailRoute />} />

          {/* Legacy /claim alias — redirect to /claims/:id */}
          <Route path="/claim/:id" element={<Navigate to="/claims/:id" replace />} />

          {/* Auth — bounce signed-in users to /claims */}
          <Route
            path="/signin"
            element={
              <RedirectIfSignedIn>
                <SignIn />
              </RedirectIfSignedIn>
            }
          />
          <Route
            path="/signup"
            element={
              <RedirectIfSignedIn>
                <SignUp />
              </RedirectIfSignedIn>
            }
          />

          {/* Protected */}
          <Route element={<ProtectedRoute />}>
            <Route path="/profile" element={<Profile />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/discussions" element={<Discussions />} />
            <Route path="/discussions/:id" element={<Discussions />} />
          </Route>

          {/* Legacy aliases */}
          <Route path="/dashboard" element={<Navigate to="/profile" replace />} />
          <Route path="/feed/*" element={<Navigate to="/" replace />} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
