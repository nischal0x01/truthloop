/**
 * App — top-level router + global providers.
 *
 * Provider order (outer → inner):
 *   - AuthProvider      → owns the `useAuth()` cache; reads /api/auth/me on mount.
 *   - <BrowserRouter>   → enables react-router hooks in every component below.
 *   - <Routes>          → renders the active page.
 *
 * Route map:
 *   /              → RootRoute — renders Feed if signed in, Landing if not
 *   /claim/:id     → Feed with that claim open in the detail panel
 *   /signin        → public auth form (redirects authenticated users to /)
 *   /signup        → public auth form (redirects authenticated users to /)
 *   /dashboard     → protected, behind <ProtectedRoute />
 *   /feed/*        → legacy alias → 308 to /
 *   *              → catch-all → /
 *
 * Why `/` is the feed for signed-in users:
 *   - "Where am I after login?" always has one answer.
 *   - Avoids the redirect chain (auth → /feed → /) that caused the nav flicker.
 */

import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Nav } from '@/components/landing/nav';
import { Hero } from '@/components/landing/hero';
import { WhyTruthLoop } from '@/components/landing/why-truthloop';
import { LoopSteps } from '@/components/landing/loop-steps';
import { BlindSpot } from '@/components/landing/blind-spot';
import { Forecast } from '@/components/landing/forecast';
import { CTA } from '@/components/landing/cta';
import { Footer } from '@/components/landing/footer';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AuthProvider, useAuth } from '@/contexts/auth-context';
import { SignIn } from '@/pages/SignIn';
import { SignUp } from '@/pages/SignUp';
import { Profile } from '@/pages/Profile';
import { Feed } from '@/pages/Feed';
import { Leaderboard } from '@/pages/Leaderboard';

/* ── Landing (marketing) ── */

const Landing = () => (
  <div className="min-h-screen bg-background text-foreground">
    <Nav />
    <main>
      <Hero />
      <WhyTruthLoop />
      <LoopSteps />
      <BlindSpot />
      <Forecast />
      <CTA />
    </main>
    <Footer />
  </div>
);

/* ── Root route: Feed if signed-in, Landing otherwise ── */

function RootRoute({ claimId }: { claimId?: string }) {
  const { status } = useAuth();
  const location = useLocation();

  // While we don't yet know who's signed in, render a tiny neutral loader
  // so the user never sees the marketing landing flash in for a second
  // before being replaced by the feed.
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
    // Preserve search params (e.g. ?welcome=true from OAuth callback)
    return <Feed initialSearch={location.search} selectedClaimId={claimId} />;
  }

  return <Landing />;
}

/**
 * /claim/:id — the feed with one claim opened in the detail panel.
 * Selection lives in the URL so the panel is shareable and the back button
 * closes it. Signed-out visitors fall through to the landing page.
 */
function ClaimRoute() {
  const { id } = useParams<{ id: string }>();
  return <RootRoute claimId={id} />;
}

/**
 * Bounce signed-in users away from /signin or /signup — they have no business
 * there. Keeps the landing flow clean.
 */
function RedirectIfSignedIn({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  if (status === 'authenticated') return <Navigate to="/" replace />;
  return <>{children}</>;
}

const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Root — adaptive */}
          <Route path="/" element={<RootRoute />} />

          {/* Feed with a claim open in the detail panel — deep-linkable */}
          <Route path="/claim/:id" element={<ClaimRoute />} />

          {/* Auth — bounce signed-in users to / */}
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
          </Route>

          {/* Legacy aliases — keep old bookmarks alive */}
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