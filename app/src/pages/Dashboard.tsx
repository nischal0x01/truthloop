/* Hallmark · page: dashboard · genre: app-shell · theme: Gumroad system
 *
 * Authenticated landing surface after sign-in. Shows the current user, points,
 * a placeholder for the weekly blind-spot card, and a sign-out button.
 *
 * Pulls all data from `useAuth()` — no extra queries yet, the rest of the
 * app surface (claims, leaderboard, forecast) will plug in later.
 */

import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  LogOut,
  Flame,
  Trophy,
  ShieldCheck,
  Target,
  Mail,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/auth/UserAvatar';

/* ── Reusable card ── */
function StatCard({
  icon,
  label,
  value,
  accent = 'default',
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  accent?: 'default' | 'accent' | 'highlight';
}) {
  const accentClass =
    accent === 'accent'
      ? 'bg-accent text-accent-foreground'
      : accent === 'highlight'
        ? 'bg-highlight text-highlight-foreground'
        : 'bg-card text-card-foreground';

  return (
    <div className="border-2 border-black rounded-lg bg-card p-5 shadow-hard">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-label-small uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 text-display-large font-medium leading-none">{value}</p>
        </div>
        <div
          className={`size-10 grid place-items-center rounded-lg border-2 border-black ${accentClass}`}
          aria-hidden="true"
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

export function Dashboard() {
  const { user, status, signOut } = useAuth();
  const navigate = useNavigate();

  /* Bounce signed-out users back to /signin (defence in depth — ProtectedRoute
     already handles this, but we keep it in case of in-tab sign-out). */
  useEffect(() => {
    if (status === 'unauthenticated') navigate('/signin', { replace: true });
  }, [status, navigate]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Top bar ── */}
      <header className="sticky top-0 z-30 bg-background border-b-2 border-black">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <Link
            to="/"
            className="flex items-center gap-2 text-label font-semibold tracking-[-0.02em]"
          >
            <ShieldCheck size={20} strokeWidth={2.2} aria-hidden="true" />
            <span>TruthLoop</span>
          </Link>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-3">
              <UserAvatar
                src={user.avatarUrl}
                name={user.displayName}
                size={36}
                className="border-2 border-black"
              />
              <div className="leading-tight">
                <p className="text-label-small font-medium">{user.displayName}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Mail size={12} aria-hidden="true" />
                  {user.email}
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="default"
              onClick={() => {
                void signOut().then(() => navigate('/'));
              }}
              className="border-2 border-black rounded-lg hover-lift"
              aria-label="Sign out"
            >
              <LogOut size={16} aria-hidden="true" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* ── Body ── */}
      <main className="mx-auto max-w-6xl px-6 py-10">
        {/* Welcome */}
        <section className="mb-10">
          <p className="text-label-small uppercase tracking-wider text-muted-foreground">
            Welcome back
          </p>
          <h1 className="mt-2 text-display-large font-medium leading-[1.05] tracking-[-0.02em]">
            {user.displayName.split(' ')[0]}.
          </h1>
          <p className="mt-3 text-body text-muted-foreground max-w-xl">
            Ready to spot some lies? Your streak, points, and blind-spot report
            live here. Cast a vote on today's claim to keep the streak going.
          </p>
        </section>

        {/* Stat grid */}
        <section
          aria-label="Your stats"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10"
        >
          <StatCard
            icon={<Trophy size={18} aria-hidden="true" />}
            label="Points"
            value={user.points}
            accent="accent"
          />
          <StatCard
            icon={<Flame size={18} aria-hidden="true" />}
            label="Day streak"
            value={0}
          />
          <StatCard
            icon={<Target size={18} aria-hidden="true" />}
            label="Accuracy"
            value="—"
          />
          <StatCard
            icon={<ShieldCheck size={18} aria-hidden="true" />}
            label="Badges"
            value={0}
            accent="highlight"
          />
        </section>

        {/* Blind-spot placeholder — will become the weekly report */}
        <section className="border-2 border-black rounded-lg bg-card p-6 shadow-hard">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <p className="text-label-small uppercase tracking-wider text-muted-foreground">
                Weekly blind-spot
              </p>
              <h2 className="mt-1 text-heading-1 font-medium tracking-[-0.02em]">
                Your blind spot is loading…
              </h2>
            </div>
          </div>
          <p className="text-body text-muted-foreground max-w-2xl">
            After 7 days of voting we'll surface the specific category of
            misinformation that fools you the most — that's your blind spot.
            Keep voting to unlock it.
          </p>
        </section>

        {/* Quick actions */}
        <section className="mt-10 flex flex-wrap items-center gap-3">
          <Button
            asChild
            className="bg-accent text-accent-foreground border-2 border-black rounded-lg shadow-hard hover-lift"
            size="lg"
          >
            <Link to="/">Vote on today's claim</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="border-2 border-black rounded-lg hover-lift"
          >
            <Link to="/">View leaderboard</Link>
          </Button>
        </section>
      </main>
    </div>
  );
}