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
 * The page itself only owns the dummy data + composition. Each view
 * sub-component lives under @/components/leaderboard/:
 *   - Podium              → top-3 highlight strip
 *   - LeaderboardRow      → single ranked row
 *   - RankMedal           → rank badge (crown / medal / number)
 *   - YourRankCard        → sidebar card: "#42" + stats
 *   - NextMilestoneCard   → sidebar card: progress bars + streak
 *   - RecentActivityCard  → sidebar card: global activity feed
 *
 * Uses hardcoded dummy data — swap to API once /api/leaderboard/* lands.
 */

/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V4 */

import { motion } from 'motion/react';
import { Flame, TrendingUp, Trophy } from 'lucide-react';
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

/* ── Dummy data (replace with API once available) ── */

const dailyLeaderboard: PodiumEntry[] = [
  { rank: 1, name: 'Priya Sharma', avatar: null, points: 280, streak: 12 },
  { rank: 2, name: 'Marco Rossi', avatar: null, points: 245, streak: 8 },
  { rank: 3, name: 'Aisha Patel', avatar: null, points: 220, streak: 6 },
  { rank: 4, name: 'James Chen', avatar: null, points: 195, streak: 4 },
  { rank: 5, name: 'Sofia Rodriguez', avatar: null, points: 180, streak: 3 },
];

const allTimeLeaderboard: PodiumEntry[] = [
  { rank: 1, name: 'Priya Sharma', avatar: null, points: 4820, badges: 12 },
  { rank: 2, name: 'Marco Rossi', avatar: null, points: 4350, badges: 10 },
  { rank: 3, name: 'Aisha Patel', avatar: null, points: 3980, badges: 9 },
  { rank: 4, name: 'James Chen', avatar: null, points: 3650, badges: 8 },
  { rank: 5, name: 'Sofia Rodriguez', avatar: null, points: 3290, badges: 7 },
  { rank: 6, name: "Liam O'Brien", avatar: null, points: 2980, badges: 6 },
  { rank: 7, name: 'Yuki Tanaka', avatar: null, points: 2650, badges: 5 },
  { rank: 8, name: 'Emma Wilson', avatar: null, points: 2340, badges: 5 },
];

const recentActivity: ActivityEntry[] = [
  { id: '1', user: 'Priya S.', action: 'voted on', target: 'Climate Claim', correct: true, time: '2m ago' },
  { id: '2', user: 'Marco R.', action: 'voted on', target: 'Tech News', correct: false, time: '5m ago' },
  { id: '3', user: 'Aisha P.', action: 'voted on', target: 'Health Tip', correct: true, time: '8m ago' },
  { id: '4', user: 'James C.', action: 'earned badge', target: '5 Day Streak', correct: null, time: '12m ago' },
];

/* ── Page ── */

export function Leaderboard() {
  const { user } = useAuth();

  // The demo user isn't in the dummy data, so no row is highlighted. The
  // "you" pill only appears if a real user happens to match a seeded name.
  const markCurrentUser = (entries: PodiumEntry[]) =>
    entries.map((e) => ({ ...e, isCurrentUser: user?.displayName === e.name }));

  const dailyEntries = markCurrentUser(dailyLeaderboard);
  const allTimeEntries = markCurrentUser(allTimeLeaderboard);
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
            {user && (
              <YourRankCard
                rank={42}
                claimsVoted={24}
                accuracy={0.71}
                leaderboardLabel="Daily Leaderboard"
              />
            )}
            <NextMilestoneCard
              milestones={DEFAULT_MILESTONES}
              currentStreakDays={5}
            />
            <RecentActivityCard entries={recentActivity} />
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
