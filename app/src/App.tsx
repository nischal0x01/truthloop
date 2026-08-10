/**
 * App — top-level router + global providers.
 *
 * Provider order (outer → inner):
 *   - AuthProvider      → owns the `useAuth()` cache; reads /api/auth/me on mount.
 *   - <BrowserRouter>   → enables react-router hooks in every component below.
 *   - <Routes>          → renders the active page.
 *
 * Route map (truth source lives in `.ai/03-system-architecture.md` §2.2):
 *   /              → public landing page
 *   /signin        → public auth form (redirects authenticated users to /dashboard)
 *   /signup        → public auth form (redirects authenticated users to /dashboard)
 *   /dashboard     → protected, behind <ProtectedRoute />
 *
 * To add a new protected page later:
 *   <Route element={<ProtectedRoute />}>
 *     <Route path="/leaderboard" element={<Leaderboard />} />
 *     <Route path="/forecast" element={<Forecast />} />
 *   </Route>
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import { Dashboard } from '@/pages/Dashboard';

/* Hallmark · macrostructure: Long Document · tone: editorial + playful
 * theme: Gumroad system (off-white #f4f4f0 · hot-pink #ff90e8 · ABC Favorit)
 * enrichment: none (typography only)
 * nav: N1b canonical · footer: Ft1 editorial statement
 */

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

/**
 * Bounce signed-in users away from /signin or /signup — they have no business
 * there. Keeps the landing flow clean.
 */
function RedirectIfSignedIn({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  if (status === 'authenticated') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Landing />} />

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
            <Route path="/dashboard" element={<Dashboard />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;