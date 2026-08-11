/**
 * Leaderboard — daily + all-time rankings with dummy data.
 * Uses the Gumroad design system tokens and patterns.
 */

import { motion } from 'motion/react';
import {
  Trophy,
  Medal,
  TrendingUp,
  Flame,
  Star,
  Clock,
  TrendingUp as TrendingUpIcon,
} from 'lucide-react';
import { UserAvatar } from '@/components/auth/UserAvatar';
import { AppNav } from '@/components/AppNav';
import { useAuth } from '@/contexts/auth-context';

/* ── Dummy data ── */
const dailyLeaderboard = [
  { rank: 1, name: 'Priya Sharma', avatar: null, points: 280, streak: 12 },
  { rank: 2, name: 'Marco Rossi', avatar: null, points: 245, streak: 8 },
  { rank: 3, name: 'Aisha Patel', avatar: null, points: 220, streak: 6 },
  { rank: 4, name: 'James Chen', avatar: null, points: 195, streak: 4 },
  { rank: 5, name: 'Sofia Rodriguez', avatar: null, points: 180, streak: 3 },
];

const allTimeLeaderboard = [
  { rank: 1, name: 'Priya Sharma', avatar: null, points: 4820, badges: 12 },
  { rank: 2, name: 'Marco Rossi', avatar: null, points: 4350, badges: 10 },
  { rank: 3, name: 'Aisha Patel', avatar: null, points: 3980, badges: 9 },
  { rank: 4, name: 'James Chen', avatar: null, points: 3650, badges: 8 },
  { rank: 5, name: 'Sofia Rodriguez', avatar: null, points: 3290, badges: 7 },
  { rank: 6, name: "Liam O'Brien", avatar: null, points: 2980, badges: 6 },
  { rank: 7, name: 'Yuki Tanaka', avatar: null, points: 2650, badges: 5 },
  { rank: 8, name: 'Emma Wilson', avatar: null, points: 2340, badges: 5 },
];

/* ── Rank medal component ── */
function RankMedal({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span className="flex size-8 items-center justify-center rounded-full bg-yellow border-2 border-black">
        <Medal size={16} className="text-black" />
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span className="flex size-8 items-center justify-center rounded-full bg-muted-text border-2 border-black">
        <Medal size={16} className="text-black" />
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span className="flex size-8 items-center justify-center rounded-full bg-orange border-2 border-black">
        <Medal size={16} className="text-black" />
      </span>
    );
  }
  return (
    <span className="flex size-8 items-center justify-center rounded-full bg-card border-2 border-black text-label-small font-bold">
      {rank}
    </span>
  );
}

/* ── Leaderboard row ── */
function LeaderboardRow({
  rank,
  name,
  points,
  streak,
  badges,
  isCurrentUser,
}: {
  rank: number;
  name: string;
  avatar: string | null;
  points: number;
  streak?: number;
  badges?: number;
  isCurrentUser?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: rank * 0.05 }}
      className={`flex items-center gap-4 rounded-lg border-2 border-black p-4 ${
        isCurrentUser ? 'bg-yellow shadow-hard' : 'bg-card shadow-hard-sm hover-lift'
      }`}
    >
      <RankMedal rank={rank} />

      <UserAvatar
        src={null}
        name={name}
        size={40}
        className="border-2 border-black"
        fallbackClassName="bg-pink-accent text-black"
      />

      <div className="flex-1 min-w-0">
        <p className="text-label font-semibold truncate">
          {name}
          {isCurrentUser && (
            <span className="ml-2 text-label-small text-muted-foreground">(you)</span>
          )}
        </p>
        <div className="flex items-center gap-3 text-label-small text-muted-foreground">
          {streak !== undefined && (
            <span className="flex items-center gap-1">
              <Flame size={12} />
              {streak} day streak
            </span>
          )}
          {badges !== undefined && (
            <span className="flex items-center gap-1">
              <Trophy size={12} />
              {badges} badges
            </span>
          )}
        </div>
      </div>

      <div className="text-right">
        <p className="text-heading-3 font-bold">{points.toLocaleString()}</p>
        <p className="text-label-small text-muted-foreground">points</p>
      </div>
    </motion.div>
  );
}

/* ── Main component ── */
export function Leaderboard() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Shared App Nav */}
      <AppNav showClaims={true} />

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left: Leaderboard sections */}
          <div className="flex-1 space-y-10">
            {/* Daily leaderboard */}
            <section>
              <div className="mb-4 flex items-center gap-2">
                <Trophy size={20} className="text-pink-accent" />
                <h2 className="font-display text-heading-2 font-semibold">Daily Rankings</h2>
                <span className="text-label-small text-muted-foreground">today</span>
              </div>
              <div className="space-y-3">
                {dailyLeaderboard.map((entry) => (
                  <LeaderboardRow
                    key={entry.rank}
                    rank={entry.rank}
                    name={entry.name}
                    avatar={entry.avatar}
                    points={entry.points}
                    streak={entry.streak}
                    isCurrentUser={user?.displayName === entry.name}
                  />
                ))}
              </div>
            </section>

            {/* All-time leaderboard */}
            <section>
              <div className="mb-4 flex items-center gap-2">
                <TrendingUp size={20} className="text-pink-accent" />
                <h2 className="font-display text-heading-2 font-semibold">All-Time Rankings</h2>
              </div>
              <div className="space-y-3">
                {allTimeLeaderboard.map((entry) => (
                  <LeaderboardRow
                    key={entry.rank}
                    rank={entry.rank}
                    name={entry.name}
                    avatar={entry.avatar}
                    points={entry.points}
                    badges={entry.badges}
                    isCurrentUser={user?.displayName === entry.name}
                  />
                ))}
              </div>
            </section>
          </div>

          {/* Right: Stats */}
          <div className="lg:w-80 space-y-6">
            {/* Your Rank Card */}
            {user && (
              <div className="rounded-lg border-2 border-black bg-accent/10 p-6 shadow-hard">
                <div className="flex items-center gap-2 mb-4">
                  <Star size={20} className="text-accent" />
                  <h3 className="font-display text-heading-3 font-semibold">Your Rank</h3>
                </div>
                <div className="text-center">
                  <p className="font-display text-display-small font-bold">#42</p>
                  <p className="text-label text-muted-foreground">Daily Leaderboard</p>
                  <div className="mt-3 pt-3 border-t border-black/20">
                    <p className="text-label-small text-muted-foreground">You've voted on</p>
                    <p className="font-display text-heading-3 font-bold">24 claims</p>
                    <p className="text-label-small text-muted-foreground">with 71% accuracy</p>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Activity Feed */}
            <div className="rounded-lg border-2 border-black bg-card p-6 shadow-hard">
              <div className="flex items-center gap-2 mb-4">
                <Clock size={20} className="text-accent" />
                <h3 className="font-display text-heading-3 font-semibold">Recent Activity</h3>
              </div>
              <div className="space-y-3">
                {[
                  { user: 'Priya S.', action: 'voted on', target: 'Climate Claim', correct: true, time: '2m ago' },
                  { user: 'Marco R.', action: 'voted on', target: 'Tech News', correct: false, time: '5m ago' },
                  { user: 'Aisha P.', action: 'voted on', target: 'Health Tip', correct: true, time: '8m ago' },
                  { user: 'James C.', action: 'earned badge', target: '5 Day Streak', correct: null, time: '12m ago' },
                ].map((activity, i) => (
                  <div key={i} className="flex items-start gap-3 text-label-small">
                    <UserAvatar
                      src={null}
                      name={activity.user}
                      size={28}
                      className="border border-black shrink-0"
                      fallbackClassName="bg-muted text-foreground text-[10px]"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="leading-tight">
                        <span className="font-semibold">{activity.user}</span>{' '}
                        {activity.action}{' '}
                        <span className="font-medium">{activity.target}</span>
                      </p>
                      <p className="text-muted-foreground text-[10px]">{activity.time}</p>
                    </div>
                    {activity.correct !== null && (
                      <span className={[
                        'size-5 rounded-full flex items-center justify-center border text-[10px]',
                        activity.correct ? 'bg-real/20 border-real text-real' : 'bg-fake/20 border-fake text-fake'
                      ].join(' ')}>
                        {activity.correct ? '✓' : '✕'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Next Milestone */}
            <div className="rounded-lg border-2 border-black bg-accent/5 p-6 shadow-hard">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUpIcon size={20} className="text-accent" />
                <h3 className="font-display text-heading-3 font-semibold">Next Milestone</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-label-small">
                  <span>Top 10 Daily</span>
                  <span className="font-semibold">38 pts away</span>
                </div>
                <div className="h-2 bg-muted rounded-full border border-black overflow-hidden">
                  <motion.div
                    initial={{ width: '0%' }}
                    animate={{ width: '85%' }}
                    transition={{ delay: 0.3, duration: 0.8, ease: 'easeOut' }}
                    className="h-full bg-accent"
                  />
                </div>
                <div className="flex items-center justify-between text-label-small">
                  <span className="flex items-center gap-1">
                    <Medal size={10} className="text-yellow" /> Gold Badge
                  </span>
                  <span className="font-semibold">120 pts away</span>
                </div>
                <div className="h-2 bg-muted rounded-full border border-black overflow-hidden">
                  <motion.div
                    initial={{ width: '0%' }}
                    animate={{ width: '60%' }}
                    transition={{ delay: 0.5, duration: 0.8, ease: 'easeOut' }}
                    className="h-full bg-yellow"
                  />
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-black/20 flex items-center justify-between">
                <span className="text-label-small text-muted-foreground">Current streak</span>
                <span className="font-display text-heading-3 font-bold flex items-center gap-1">
                  <Flame size={16} className="text-orange" /> 5 days
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
