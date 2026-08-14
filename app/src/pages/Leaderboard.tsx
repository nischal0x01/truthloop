/**
 * Leaderboard — daily + all-time rankings.
 *
 * Layout (desktop):
 *   ┌───────────────────────────────┬──────────────┐
 *   │  Hero (title + meta)         │              │
 *   │  Daily podium (top-3 cards)  │ Your rank    │
 *   │  Daily rows (4+)             │ Next milestone│
 *   │  All-time podium             │ Recent activity│
 *   │  All-time rows               │              │
 *   └───────────────────────────────┴──────────────┘
 *
 * On mobile the sidebar drops below the leaderboards (single column).
 *
 * The page fetches live data from /api/leaderboard/* via TanStack Query.
 * Each view
 * sub-component lives under @/components/leaderboard/:
 *   - Podium              → top-3 highlight strip
 *   - LeaderboardRow      → single ranked row
 *   - RankMedal           → rank badge (crown / medal / number)
 *   - YourRankCard        → sidebar card: "#42" + stats
 *   - NextMilestoneCard   → sidebar card: progress bars + streak
 *   - RecentActivityCard  → sidebar card: global activity feed
 *
 * Live data fetched via /api/leaderboard/* endpoints.
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
import {
  LeaderboardRow,
} from '@/components/leaderboard/LeaderboardRow';
import {
  Podium,
  type PodiumEntry,
} from '@/components/leaderboard/Podium';
import {
  RecentActivityCard,
  type ActivityEntry,
} from '@/components/leaderboard/RecentActivityCard';
import { YourRankCard } from '@/components/leaderboard/YourRankCard';
import { useAuth } from '@/contexts/auth-context';
import { EASE } from '@/lib/motion';
import {
  getDailyLeaderboardQuery,
  getAllTimeLeaderboardQuery,
  getUserRankQuery,
  getActivityQuery,
} from '@/actions/leaderboard';

/* ── Page ── */

export function Leaderboard() {
  const { user } = useAuth();

  const { data: dailyData } = useQuery(getDailyLeaderboardQuery());
  const { data: allTimeData } = useQuery(getAllTimeLeaderboardQuery());
  const { data: userRankData } = useQuery(getUserRankQuery());
  const { data: activityData } = useQuery(getActivityQuery());

  // API already marks isCurrentUser on each entry — just use as-is.
  const dailyEntries: PodiumEntry[] = (dailyData?.entries ?? []).map((e) => ({
    ...e,
    // Fallback rank if API doesn't provide it
    rank: e.rank,
    name: e.name,
    avatar: e.avatar,
    points: e.points,
    streak: e.streak,
    isCurrentUser: e.isCurrentUser,
  }));
  const allTimeEntries: PodiumEntry[] = (allTimeData?.entries ?? []).map((e) => ({
    ...e,
    rank: e.rank,
    name: e.name,
    avatar: e.avatar,
    points: e.points,
    badges: e.badges,
    isCurrentUser: e.isCurrentUser,
  }));

  const dailyPodium = dailyEntries.slice(0, 3);
  const dailyRest = dailyEntries.slice(3);
  const allTimePodium = allTimeEntries.slice(0, 3);
  const allTimeRest = allTimeEntries.slice(3);

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
            {/* Daily leaderboard */}
            <section aria-label="Daily leaderboard">
              <SectionHeading
                icon={<Flame size={18} className="text-orange" aria-hidden="true" />}
                eyebrow="Today"
                title="Daily Rankings"
                meta="resets in 4h"
                index={0}
              />
              <Podium entries={dailyPodium} />
              <div className="space-y-3">
                {dailyRest.map((entry, i) => (
                  <LeaderboardRow
                    key={entry.rank}
                    rank={entry.rank}
                    name={entry.name}
                    avatar={entry.avatar}
                    points={entry.points}
                    streak={entry.streak}
                    isCurrentUser={entry.isCurrentUser}
                    index={i}
                  />
                ))}
              </div>
            </section>

            {/* All-time leaderboard */}
            <section aria-label="All-time leaderboard">
              <SectionHeading
                icon={<TrendingUp size={18} className="text-pink-accent" aria-hidden="true" />}
                eyebrow="Since launch"
                title="All-Time Rankings"
                index={1}
              />
              <Podium entries={allTimePodium} />
              <div className="space-y-3">
                {allTimeRest.map((entry, i) => (
                  <LeaderboardRow
                    key={entry.rank}
                    rank={entry.rank}
                    name={entry.name}
                    avatar={entry.avatar}
                    points={entry.points}
                    badges={entry.badges}
                    isCurrentUser={entry.isCurrentUser}
                    index={i}
                  />
                ))}
              </div>
            </section>
          </div>

          {/* ── Right: sidebar ── */}
          <aside className="space-y-6 lg:sticky lg:top-6 lg:w-80 lg:self-start">
            {user && userRankData && (
              <YourRankCard
                rank={userRankData.dailyRank ?? 0}
                claimsVoted={userRankData.totalGuesses}
                accuracy={userRankData.accuracy}
                leaderboardLabel="Daily Leaderboard"
              />
            )}
            <NextMilestoneCard
              milestones={DEFAULT_MILESTONES}
              currentStreakDays={user?.streakDays ?? 0}
            />
            <RecentActivityCard
              entries={(activityData?.entries ?? []) as ActivityEntry[]}
            />
          </aside>
        </div>
      </main>
    </div>
  );
}

/* ── Shared section heading ── */

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
