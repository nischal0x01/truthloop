/* Hallmark · page: profile · genre: app-shell · theme: Gumroad system
 *
 * Authenticated user profile. Pulls one composite payload from
 * /api/users/me/profile and renders:
 *
 *   1. Hero        — avatar (size 80), name, email, member-since, admin chip
 *   2. Stats grid  — Points, Streak, Accuracy, Badges X/8
 *   3. Badges      — 8-up grid, earned vs locked, with rarity colouring
 *   4. Weekly report preview — accuracy, blind-spot, narrative (or teaser)
 *   5. Recent activity — last 5 votes with claim text + verdict outcome
 *
 * Every section degrades gracefully (skeleton / placeholder) while the
 * single query is in-flight.
 */

import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LogOut,
  Flame,
  Trophy,
  Target,
  Award,
  ShieldCheck,
  Mail,
  Calendar,
  Check,
  X,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/auth/UserAvatar';
import {
  profileApi,
  profileKeys,
  memberSince,
  rarityMeta,
  timeAgo,
  truncate,
  type ProfileBadge,
  type RecentVote,
  type WeeklyReportPreview,
} from '@/lib/profile';
import { CATEGORY_META, type ClaimCategory } from '@/lib/claims';

/* ── Stat card (hero KPIs) ── */

function StatCard({
  icon,
  label,
  value,
  hint,
  accent = 'default',
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  hint?: string;
  accent?: 'default' | 'accent' | 'highlight' | 'warning';
}) {
  const accentClass =
    accent === 'accent'
      ? 'bg-accent text-accent-foreground'
      : accent === 'highlight'
        ? 'bg-highlight text-highlight-foreground'
        : accent === 'warning'
          ? 'bg-warning text-warning-foreground'
          : 'bg-card text-card-foreground';

  return (
    <div className="border-2 border-black rounded-lg bg-card p-5 shadow-hard">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-label-small uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 text-display-large font-medium leading-none">{value}</p>
          {hint && <p className="mt-1.5 text-label-small text-muted-foreground">{hint}</p>}
        </div>
        <div
          className={`size-10 shrink-0 grid place-items-center rounded-lg border-2 border-black ${accentClass}`}
          aria-hidden="true"
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

/* ── Badge tile ── */

function BadgeTile({ badge }: { badge: ProfileBadge }) {
  const earned = badge.earnedAt !== null;
  const meta = rarityMeta(badge.rarity);

  return (
    <div
      className={[
        'relative flex flex-col items-center gap-2 rounded-lg border-2 p-4 text-center transition-all',
        earned
          ? `${meta.bg} ${meta.ink} border-black shadow-hard-sm`
          : `bg-muted/40 border-black/20 text-muted-foreground`,
      ].join(' ')}
      title={earned ? `Earned ${timeAgo(badge.earnedAt!)}` : 'Locked'}
    >
      {/* Status dot */}
      <span
        className={[
          'absolute right-2 top-2 size-2 rounded-full',
          earned ? 'bg-black' : 'bg-black/15',
        ].join(' ')}
        aria-hidden="true"
      />

      <span
        className={['text-3xl', earned ? '' : 'grayscale opacity-50'].join(' ')}
        aria-hidden="true"
      >
        {badge.icon}
      </span>

      <div className="min-w-0">
        <p className={['text-label-small font-medium leading-tight', earned ? '' : ''].join(' ')}>
          {badge.name}
        </p>
        <p
          className={[
            'mt-0.5 text-[10px] uppercase tracking-wider',
            earned ? 'opacity-70' : 'opacity-50',
          ].join(' ')}
        >
          {meta.label}
        </p>
      </div>

      <p className="text-[11px] leading-snug text-current/70 line-clamp-2">{badge.description}</p>
    </div>
  );
}

/* ── Recent vote row ── */

function RecentVoteRow({ vote }: { vote: RecentVote }) {
  const categoryMeta = CATEGORY_META[vote.claimCategory as ClaimCategory] ?? {
    label: vote.claimCategory,
    bg: 'bg-muted',
    ink: 'text-foreground',
  };

  return (
    <li className="flex items-start gap-3 border-b border-black/10 py-3 last:border-b-0">
      <span
        className={[
          'mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-md border-2 border-black',
          vote.isCorrect ? 'bg-highlight text-highlight-foreground' : 'bg-danger text-danger-foreground',
        ].join(' ')}
        aria-hidden="true"
      >
        {vote.isCorrect ? <Check size={14} /> : <X size={14} />}
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-body leading-snug" style={{ overflowWrap: 'anywhere' }}>
          &ldquo;{truncate(vote.claimText, 120)}&rdquo;
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-label-small text-muted-foreground">
          <span
            className={`inline-flex items-center gap-1 rounded-sm border border-black/20 px-1.5 py-0.5 text-[11px] ${categoryMeta.bg} ${categoryMeta.ink}`}
          >
            {categoryMeta.icon} {categoryMeta.label}
          </span>
          <span>
            You said <strong className="uppercase">{vote.userAnswer}</strong>
            {' · '}
            it was <strong className="uppercase">{vote.claimVerdict}</strong>
          </span>
          <span>· {timeAgo(vote.createdAt)}</span>
        </div>
      </div>
    </li>
  );
}

/* ── Weekly report panel ── */

function WeeklyReportPanel({ report }: { report: WeeklyReportPreview | null }) {
  if (!report) {
    return (
      <section className="border-2 border-black rounded-lg bg-card p-6 shadow-hard">
        <p className="text-label-small uppercase tracking-wider text-muted-foreground">
          Weekly blind-spot
        </p>
        <h2 className="mt-1 text-heading-2 font-medium tracking-[-0.02em]">
          Keep voting to unlock your report.
        </h2>
        <p className="mt-3 text-body text-muted-foreground max-w-2xl">
          Every Sunday we generate a one-page report from your past 7 days of
          votes — your accuracy, the category you miss most, and a single claim
          to replay. We'll send you an email when it's ready.
        </p>
      </section>
    );
  }

  const accuracyPct =
    report.userAccuracy !== null
      ? Math.round(report.userAccuracy * 100)
      : report.totalGuesses > 0
        ? Math.round((report.correctGuesses / report.totalGuesses) * 100)
        : 0;
  const globalPct =
    report.globalAverageAccuracy !== null ? Math.round(report.globalAverageAccuracy * 100) : null;

  return (
    <section
      className="border-2 border-black rounded-lg bg-dark-panel text-white shadow-hard overflow-hidden"
      aria-label="Weekly blind-spot report"
    >
      <header className="flex items-center justify-between gap-3 border-b-2 border-white/20 px-6 py-4">
        <div>
          <p className="text-label-small uppercase tracking-wider text-white/60">
            Weekly blind-spot
          </p>
          <p className="mt-0.5 text-label font-medium">
            Week of {new Date(report.weekStarting).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </p>
        </div>
        <Sparkles size={20} aria-hidden="true" className="text-pink-accent" />
      </header>

      <div className="grid gap-6 p-6 md:grid-cols-2">
        <div>
          <p className="text-label-small uppercase tracking-wider text-white/60">Accuracy</p>
          <p className="mt-2 text-display-large font-medium">{accuracyPct}%</p>
          <p className="mt-1 text-label-small text-white/70">
            {report.correctGuesses} of {report.totalGuesses} correct
            {globalPct !== null && ` · global avg ${globalPct}%`}
          </p>
        </div>

        <div>
          <p className="text-label-small uppercase tracking-wider text-white/60">Blind spot</p>
          {report.blindSpotCategory ? (
            <>
              <p className="mt-2 text-heading-2 font-medium text-pink-accent">
                {report.blindSpotCategory.replace(/_/g, ' ')}
              </p>
            </>
          ) : (
            <p className="mt-2 text-heading-3 font-medium text-white/70">Perfect week.</p>
          )}
        </div>
      </div>

      {report.blindSpotNarrative && (
        <div className="border-t-2 border-white/20 px-6 py-5">
          <p className="text-label-small uppercase tracking-wider text-white/60">The narrative</p>
          <p
            className="mt-2 text-body-large leading-snug"
            style={{ overflowWrap: 'anywhere' }}
          >
            {report.blindSpotNarrative}
          </p>
        </div>
      )}
    </section>
  );
}

/* ── Page ── */

export function Profile() {
  const { user, status, signOut } = useAuth();
  const navigate = useNavigate();

  // Defence in depth — ProtectedRoute already handles this.
  useEffect(() => {
    if (status === 'unauthenticated') navigate('/signin', { replace: true });
  }, [status, navigate]);

  const profileQuery = useQuery({
    queryKey: profileKeys.me(),
    queryFn: () => profileApi.me(),
    enabled: status === 'authenticated',
  });

  if (!user) return null;

  const profile = profileQuery.data;
  const stats = profile?.stats;
  const badges = profile?.badges ?? [];
  const recent = profile?.recentActivity ?? [];
  const weekly = profile?.latestWeeklyReport ?? null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Top bar ── */}
      <header className="sticky top-0 z-30 bg-background border-b-2 border-black">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <Link
            to="/"
            className="flex items-center gap-2 text-label font-semibold tracking-[-0.02em]"
          >
            <ShieldCheck size={20} strokeWidth={2.2} aria-hidden="true" />
            <span>TruthLoop</span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="hidden text-label text-foreground hover:underline underline-offset-4 sm:inline"
            >
              Feed
            </Link>
            <Button
              variant="outline"
              size="default"
              onClick={() => {
                void signOut().then(() => navigate('/'));
              }}
              aria-label="Sign out"
              className="border-2 border-black rounded-lg hover-lift"
            >
              <LogOut size={14} aria-hidden="true" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* ── Body ── */}
      <main className="mx-auto max-w-5xl px-6 py-10">
        {/* ── Hero ── */}
        <section className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-start">
          <UserAvatar
            src={user.avatarUrl}
            name={user.displayName}
            size={96}
            className="border-2 border-black shadow-hard"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1
                className="text-display-large font-medium tracking-[-0.02em]"
                style={{ overflowWrap: 'anywhere' }}
              >
                {user.displayName}
              </h1>
              {user.isAdmin && (
                <span className="inline-flex items-center gap-1 rounded-md border-2 border-black bg-accent px-2 py-0.5 text-label-small font-medium text-accent-foreground">
                  <ShieldCheck size={12} aria-hidden="true" />
                  Admin
                </span>
              )}
            </div>
            <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-body text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Mail size={14} aria-hidden="true" />
                {user.email}
              </span>
              {profile && (
                <span className="flex items-center gap-1.5">
                  <Calendar size={14} aria-hidden="true" />
                  Joined {memberSince(profile.user.createdAt)}
                </span>
              )}
            </p>
          </div>
          <Button
            asChild
            className="bg-accent text-accent-foreground border-2 border-black rounded-lg shadow-hard hover-lift"
            size="lg"
          >
            <Link to="/">
              <ArrowUpRight size={16} aria-hidden="true" />
              Vote on today's claim
            </Link>
          </Button>
        </section>

        {/* ── Stats grid ── */}
        <section
          aria-label="Your stats"
          className="grid grid-cols-2 gap-4 mb-10 lg:grid-cols-4"
        >
          <StatCard
            icon={<Trophy size={18} aria-hidden="true" />}
            label="Points"
            value={stats?.totalVotes === 0 && !stats ? '…' : user.points}
            accent="accent"
          />
          <StatCard
            icon={<Flame size={18} aria-hidden="true" />}
            label="Day streak"
            value={profile?.user.streakDays ?? 0}
            hint={profile?.user.streakDays === 0 ? 'Cast today to start one' : undefined}
          />
          <StatCard
            icon={<Target size={18} aria-hidden="true" />}
            label="Accuracy"
            value={stats ? `${stats.accuracyPct}%` : '…'}
            hint={
              stats
                ? `${stats.correctVotes} of ${stats.totalVotes} correct`
                : 'No votes yet'
            }
          />
          <StatCard
            icon={<Award size={18} aria-hidden="true" />}
            label="Badges"
            value={stats ? `${stats.earnedBadges} / ${stats.totalBadges}` : '…'}
            hint={stats ? `${stats.totalBadges - stats.earnedBadges} to unlock` : undefined}
            accent="highlight"
          />
        </section>

        {/* ── Weekly report ── */}
        <div className="mb-10">
          <WeeklyReportPanel report={weekly} />
        </div>

        {/* ── Badges ── */}
        <section aria-labelledby="badges-heading" className="mb-10">
          <header className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-label-small uppercase tracking-wider text-muted-foreground">
                Achievements
              </p>
              <h2
                id="badges-heading"
                className="mt-1 text-heading-1 font-medium tracking-[-0.02em]"
              >
                Badges
              </h2>
            </div>
            {stats && (
              <p className="text-label-small text-muted-foreground">
                {stats.earnedBadges} earned · {stats.totalBadges - stats.earnedBadges} locked
              </p>
            )}
          </header>

          {profileQuery.isLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="h-32 animate-pulse rounded-lg border-2 border-black/20 bg-muted/40"
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {badges.map((b) => (
                <BadgeTile key={b.slug} badge={b} />
              ))}
            </div>
          )}
        </section>

        {/* ── Recent activity ── */}
        <section aria-labelledby="recent-heading" className="mb-10">
          <header className="mb-4">
            <p className="text-label-small uppercase tracking-wider text-muted-foreground">
              Your last votes
            </p>
            <h2
              id="recent-heading"
              className="mt-1 text-heading-1 font-medium tracking-[-0.02em]"
            >
              Recent activity
            </h2>
          </header>

          {profileQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-16 animate-pulse rounded-lg border-2 border-black/10 bg-muted/30"
                />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <div className="rounded-lg border-2 border-black/20 bg-card p-6 text-center text-muted-foreground">
              <p>No votes yet — head to the feed and cast your first one.</p>
              <Button asChild className="mt-3 border-2 border-black rounded-lg" variant="outline">
                <Link to="/">Open the feed</Link>
              </Button>
            </div>
          ) : (
            <ul className="rounded-lg border-2 border-black bg-card p-4 shadow-hard-sm">
              {recent.map((v) => (
                <RecentVoteRow key={v.guessId} vote={v} />
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}