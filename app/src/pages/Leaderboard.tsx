/**
 * Leaderboard — daily + all-time rankings with dummy data.
 * Uses the Gumroad design system tokens and patterns.
 */

import { motion } from 'motion/react';
import { Trophy, Medal, TrendingUp, Flame } from 'lucide-react';
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
  { rank: 6, name: 'Liam O\'Brien', avatar: null, points: 2980, badges: 6 },
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

      <main className="mx-auto max-w-3xl px-6 py-8 space-y-10">
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
      </main>
    </div>
  );
}
