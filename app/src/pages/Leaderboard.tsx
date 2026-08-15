/**
 * Leaderboard — daily + all-time rankings.
 *
 * Layout (desktop):
 *   ┌───────────────────────────────┬──────────────┐
 *   │  Hero (title + meta)         │              │
 *   │  Daily podium (top-3 cards)  │ Your rank    │
 *   │  Daily rows (4+)             │ Next milestone│
 *   │  All-time podium             │              │
 *   │  All-time rows               │              │
 *   └───────────────────────────────┴──────────────┘
 *
 * On mobile the sidebar drops below the leaderboards (single column).
 *
 * Both boards fetch from `GET /api/leaderboard?scope=...` in parallel.
 * The endpoint is public — but the response carries caller-specific
 * fields (`yourRank`, `yourPoints`, `yourStats`) only when the user is
 * signed in. So the sidebar cards gracefully degrade to empty states
 * for anonymous viewers.
 *
 * Sub-components in @/components/leaderboard/:
 *   - Podium              → top-3 highlight strip
 *   - LeaderboardRow      → single ranked row
 *   - RankMedal           → rank badge (crown / medal / number)
 *   - YourRankCard        → sidebar card: "#N" + stats
 *   - NextMilestoneCard   → sidebar card: progress bars + streak
 */

/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V4 */

import { motion } from 'motion/react';
import { Flame, TrendingUp, Trophy } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { AppNav } from '@/components/AppNav';
import {
  DEFAULT_MILESTONES,
  NextMilestoneCard,
} from '@/components/leaderboard/NextMilestoneCard';
import { LeaderboardRow } from '@/components/leaderboard/LeaderboardRow';
import { Podium, type PodiumEntry } from '@/components/leaderboard/Podium';
import { YourRankCard } from '@/components/leaderboard/YourRankCard';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { EASE } from '@/lib/motion';
import {
  getLeaderboardQuery,
  type LeaderboardResponse,
  type LeaderboardScope,
} from '@/actions/leaderboard';

/* ── Page ── */

export function Leaderboard() {
  const { user } = useAuth();

  // Both boards fire in parallel — TanStack Query de-dupes by queryKey,
  // and the `scope` key makes cache invalidation surgical.
  const dailyQuery = useQuery(getLeaderboardQuery('daily'));
  const allTimeQuery = useQuery(getLeaderboardQuery('all-time'));

  const isInitialLoading =
    dailyQuery.isLoading && !dailyQuery.data &&
    allTimeQuery.isLoading && !allTimeQuery.data;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppNav showClaims={true} />

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* ── Hero header ── */}
        <motion.header
          className="mb-8"
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
          }}
        >
          <motion.p
            variants={{
              hidden: { opacity: 0, y: 6 },
              show: { opacity: 1, y: 0 },
            }}
            transition={{ duration: 0.5, ease: EASE }}
            className="flex items-center gap-1.5 text-label-small font-semibold uppercase tracking-wider text-foreground/70"
          >
            <Trophy size={14} aria-hidden="true" />
            Hall of Fame
          </motion.p>
          <h1 className="relative mt-1 inline-block font-display text-display-medium font-semibold leading-[0.95] tracking-display text-foreground">
            <span className="relative inline-block overflow-hidden align-baseline">
              <motion.span
                className="inline-block"
                variants={{
                  hidden: { y: '110%', opacity: 0 },
                  show: { y: '0%', opacity: 1 },
                }}
                transition={{ duration: 0.8, ease: EASE, delay: 0.1 }}
              >
                Leaderboard
              </motion.span>
            </span>
            {/* Brand-pink underline */}
            <motion.span
              aria-hidden="true"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.7, ease: EASE, delay: 0.7 }}
              style={{ transformOrigin: 'left center' }}
              className="absolute -bottom-1 left-0 h-1.5 w-28 rounded-sm bg-pink-accent"
            />
          </h1>
          <motion.p
            variants={{
              hidden: { opacity: 0, y: 4 },
              show: { opacity: 1, y: 0 },
            }}
            transition={{ duration: 0.5, ease: EASE, delay: 0.4 }}
            className="mt-3 text-label text-foreground/80"
          >
            Vote, comment, and earn badges to climb the ranks.
          </motion.p>
        </motion.header>

        <div className="flex flex-col gap-8 lg:flex-row">
          {/* ── Left: leaderboards ── */}
          <div className="flex-1 space-y-10">
            {/* Combined error state — if both fail, show one banner */}
            {(dailyQuery.isError || allTimeQuery.isError) && !isInitialLoading && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: EASE }}
                className="rounded-lg border-2 border-black bg-danger p-4 text-danger-foreground"
                role="alert"
              >
                <p className="font-semibold">Couldn't load leaderboards.</p>
                <p className="mt-1 text-label-small">
                  {(dailyQuery.error as Error)?.message ||
                    (allTimeQuery.error as Error)?.message ||
                    'Unknown error'}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    dailyQuery.refetch();
                    allTimeQuery.refetch();
                  }}
                  className="mt-3 border-2 border-black rounded-lg"
                >
                  Try again
                </Button>
              </motion.div>
            )}

            <LeaderboardSection
              scope="daily"
              data={dailyQuery.data}
              isLoading={isInitialLoading || (dailyQuery.isLoading && !dailyQuery.data)}
              currentUserId={user?.id ?? null}
            />

            <LeaderboardSection
              scope="all-time"
              data={allTimeQuery.data}
              isLoading={isInitialLoading || (allTimeQuery.isLoading && !allTimeQuery.data)}
              currentUserId={user?.id ?? null}
            />
          </div>

          {/* ── Right: sidebar ── */}
          <aside className="space-y-6 lg:sticky lg:top-6 lg:w-80 lg:self-start">
            {user && dailyQuery.data?.yourStats && (
              <YourRankCard
                rank={dailyQuery.data.yourRank ?? 0}
                claimsVoted={dailyQuery.data.yourStats.totalVotes}
                accuracy={dailyQuery.data.yourStats.accuracyPct / 100}
                leaderboardLabel="Daily Leaderboard"
              />
            )}
            {user && dailyQuery.data?.yourStats && (
              <NextMilestoneCard
                milestones={buildMilestones(dailyQuery.data)}
                currentStreakDays={dailyQuery.data.yourStats.streakDays}
              />
            )}
            {!user && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: EASE }}
                className="rounded-lg border-2 border-black bg-card p-5 shadow-hard-sm"
              >
                <p className="font-semibold">Sign in to track your rank</p>
                <p className="mt-1 text-label-small text-foreground/70">
                  Your position and milestone progress show here once you&apos;re signed in.
                </p>
              </motion.div>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}

/* ── Per-scope section ── */

function LeaderboardSection({
  scope,
  data,
  isLoading,
  currentUserId,
}: {
  scope: LeaderboardScope;
  data: LeaderboardResponse | undefined;
  isLoading: boolean;
  currentUserId: string | null;
}) {
  const isDaily = scope === 'daily';

  // Convert API entries → PodiumEntry[] / LeaderboardRow props, marking
  // the calling user's row so the UI can highlight it.
  const entries = (data?.entries ?? []).map((e): PodiumEntry => ({
    rank: e.rank,
    name: e.displayName,
    avatar: e.avatarUrl,
    points: e.points,
    streak: isDaily ? e.streakDays : undefined,
    badges: isDaily ? undefined : e.badges,
    isCurrentUser: e.id === currentUserId,
  }));
  const podium = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <section aria-label={`${isDaily ? 'Daily' : 'All-time'} leaderboard`}>
      <SectionHeading
        icon={
          isDaily ? (
            <Flame size={18} className="text-orange" aria-hidden="true" />
          ) : (
            <TrendingUp size={18} className="text-pink-accent" aria-hidden="true" />
          )
        }
        eyebrow={isDaily ? 'Today' : 'Since launch'}
        title={isDaily ? 'Daily Rankings' : 'All-Time Rankings'}
        meta={isDaily ? (data ? `resets in ${resetCountdown()}` : undefined) : undefined}
        index={isDaily ? 0 : 1}
      />

      {isLoading ? (
        <BoardSkeleton />
      ) : entries.length === 0 ? (
        <EmptyState scope={scope} />
      ) : (
        <>
          <Podium entries={podium} />
          {rest.length > 0 && (
            <div className="space-y-3">
              {rest.map((entry, i) => (
                <LeaderboardRow
                  key={entry.rank}
                  rank={entry.rank}
                  name={entry.name}
                  avatar={entry.avatar}
                  points={entry.points}
                  streak={isDaily ? entry.streak : undefined}
                  badges={isDaily ? undefined : entry.badges}
                  isCurrentUser={entry.isCurrentUser}
                  index={i}
                />
              ))}
            </div>
          )}
          {/* "Your rank" footer line if the caller is signed in but not
              in the visible top-N — saves them from squinting at the JSON. */}
          {currentUserId && data?.yourRank != null && !entries.some(e => e.isCurrentUser) && (
            <p className="mt-3 text-center text-label-small text-foreground/70">
              You&apos;re #{data.yourRank} with {data.yourPoints ?? 0} pts
            </p>
          )}
        </>
      )}
    </section>
  );
}

/* ── Empty state ── */

function EmptyState({ scope }: { scope: LeaderboardScope }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="rounded-lg border-2 border-black bg-card p-8 text-center shadow-hard-sm"
    >
      <p className="font-display text-heading-3 font-semibold">
        {scope === 'daily' ? 'No activity today yet' : 'No rankings yet'}
      </p>
      <p className="mt-2 text-label text-foreground/70">
        {scope === 'daily'
          ? 'Vote on a claim to claim the top of the daily board.'
          : 'Be the first — vote on claims to start earning points.'}
      </p>
    </motion.div>
  );
}

/* ── Loading skeleton ── */

function BoardSkeleton() {
  return (
    <div className="space-y-3" aria-label="Loading leaderboard">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="h-16 w-full animate-pulse rounded-lg border-2 border-black/10 bg-muted/60"
        />
      ))}
    </div>
  );
}

/* ── Shared section heading (matches the previous style) ── */

function SectionHeading({
  icon,
  eyebrow,
  title,
  meta,
  index = 0,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  meta?: string;
  index?: number;
}) {
  return (
    <motion.header
      className="mb-4 flex items-center justify-between gap-3"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE, delay: 0.05 + index * 0.05 }}
    >
      <div className="flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-md border-2 border-black bg-card shadow-hard-sm">
          {icon}
        </span>
        <div>
          <p className="text-label-small uppercase tracking-wider text-muted-foreground">
            {eyebrow}
          </p>
          <h2 className="relative inline-block font-display text-heading-2 font-semibold tracking-display">
            <span className="relative inline-block overflow-hidden align-baseline">
              <motion.span
                className="inline-block"
                initial={{ y: '110%' }}
                animate={{ y: '0%' }}
                transition={{ duration: 0.6, ease: EASE, delay: 0.1 + index * 0.05 }}
              >
                {title}
              </motion.span>
            </span>
            <motion.span
              aria-hidden="true"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.6, ease: EASE, delay: 0.5 + index * 0.05 }}
              style={{ transformOrigin: 'left center' }}
              className="absolute -bottom-0.5 left-0 h-1 w-10 rounded-sm bg-pink-accent"
            />
          </h2>
        </div>
      </div>
      {meta && (
        <motion.span
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: EASE, delay: 0.4 + index * 0.05 }}
          className="inline-flex items-center gap-1 rounded-full border-2 border-black bg-muted px-2 py-0.5 text-label-small font-medium"
        >
          {meta}
        </motion.span>
      )}
    </motion.header>
  );
}

/* ── Helpers ── */

/** "resets in 4h" — rounds to the next whole hour. */
function resetCountdown(): string {
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(now.getUTCHours() + 1, 0, 0, 0);
  const hours = Math.round((next.getTime() - now.getTime()) / (60 * 60 * 1000));
  return `${hours}h`;
}

/**
 * Build the milestone cards from the caller's live stats. The previous
 * version used a static `DEFAULT_MILESTONES` list — this version makes
 * the bars reflect the user's actual daily points so progress feels real.
 */
function buildMilestones(data: LeaderboardResponse) {
  const pts = data.yourPoints ?? 0;
  const streak = data.yourStats?.streakDays ?? 0;
  return [
    {
      label: 'Reach top 3 on daily',
      pointsAway: Math.max(0, 300 - pts),
      progress: Math.min(1, pts / 300),
      barClass: 'bg-pink-accent',
    },
    {
      label: 'Earn a 10-day streak',
      pointsAway: Math.max(0, 10 - streak),
      progress: Math.min(1, streak / 10),
      barClass: 'bg-accent',
    },
    ...DEFAULT_MILESTONES,
  ];
}
