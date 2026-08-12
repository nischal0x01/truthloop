/**
 * Podium — top-3 highlight strip for a leaderboard.
 *
 * Layout (3 columns):
 *   ┌──────────┬──────────────┬──────────┐
 *   │  Rank 2  │   Rank 1     │  Rank 3  │
 *   │  (left)  │ (centre, ↑)  │ (right)  │
 *   │  lower   │   highest    │  lower   │
 *   └──────────┴──────────────┴──────────┘
 *
 * Each card carries:
 *   - Avatar
 *   - RankMedal (wiggling Crown for #1)
 *   - Name + points
 *   - Optional streak / badges subline
 *
 * Entrance: rank-1 springs up first, then rank-2 and rank-3 stagger in.
 * The whole strip has a staggered fade-up at the parent level.
 */

import { Flame, Trophy } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { UserAvatar } from '@/components/auth/UserAvatar';
import { EASE } from '@/lib/motion';
import { RankMedal } from './RankMedal';

export interface PodiumEntry {
  rank: number;
  name: string;
  avatar: string | null;
  points: number;
  streak?: number;
  badges?: number;
  isCurrentUser?: boolean;
}

interface PodiumProps {
  entries: PodiumEntry[]; // expects at least 3, sorted by rank ascending
}

const RANK_ORDER: Record<number, 0 | 1 | 2> = { 1: 1, 2: 0, 3: 2 };

export function Podium({ entries }: PodiumProps) {
  const reduce = useReducedMotion();

  // Order: #2 left, #1 centre (elevated), #3 right
  const ordered = [2, 1, 3]
    .map((r) => entries.find((e) => e.rank === r))
    .filter((e): e is PodiumEntry => Boolean(e));

  return (
    <motion.div
      className="mb-6 grid grid-cols-3 items-end gap-3"
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
      }}
    >
      {ordered.map((entry) => {
        const isFirst = entry.rank === 1;
        return (
          <motion.div
            key={entry.rank}
            variants={{
              hidden: { opacity: 0, y: 20, scale: 0.9 },
              show: { opacity: 1, y: 0, scale: 1 },
            }}
            transition={{ duration: 0.6, ease: EASE, type: 'spring', damping: 14, stiffness: 220 }}
            whileHover={reduce ? undefined : { y: -3 }}
            className={[
              'group relative flex flex-col items-center overflow-hidden rounded-2xl border-2 border-black p-4 text-center shadow-hard-sm transition-shadow duration-300 hover:shadow-hard',
              isFirst
                ? 'min-h-44 bg-yellow pt-6'
                : entry.rank === 2
                  ? 'min-h-36 bg-card pt-4'
                  : 'min-h-32 bg-card pt-4',
              entry.isCurrentUser ? 'ring-2 ring-black ring-offset-2' : '',
            ].join(' ')}
          >
            {/* Ambient orb behind #1 */}
            {isFirst && (
              <div
                aria-hidden
                className="pointer-events-none absolute -top-12 left-1/2 size-40 -translate-x-1/2 rounded-full bg-orange/30 blur-2xl"
              />
            )}

            <div className="relative">
              <RankMedal rank={entry.rank} animated size={isFirst ? 'lg' : 'md'} />
            </div>

            <motion.div
              initial={reduce ? false : { scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: EASE, delay: 0.3 + RANK_ORDER[entry.rank] * 0.08 }}
              className="relative mt-3"
            >
              <UserAvatar
                src={entry.avatar}
                name={entry.name}
                size={isFirst ? 64 : 48}
                className="border-2 border-black shadow-hard-sm"
                fallbackClassName="bg-pink-accent text-black"
              />
            </motion.div>

            <p className="relative mt-2.5 line-clamp-1 text-label-small font-semibold">
              {entry.name}
              {entry.isCurrentUser && (
                <span className="ml-1.5 inline-flex items-center gap-1 text-label-small text-foreground/80">
                  <span aria-hidden className="size-1 rounded-full bg-black" />
                  you
                </span>
              )}
            </p>

            <motion.p
              key={entry.points}
              initial={reduce ? false : { scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 12, stiffness: 260, delay: 0.4 }}
              className={[
                'relative mt-1 font-display tabular-nums',
                isFirst ? 'text-display-medium font-bold' : 'text-heading-3 font-bold',
              ].join(' ')}
            >
              {entry.points.toLocaleString()}
            </motion.p>
            <p className="relative text-[10px] uppercase tracking-wider text-muted-foreground">
              points
            </p>

            {(entry.streak !== undefined || entry.badges !== undefined) && (
              <div className="relative mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
                {entry.streak !== undefined && (
                  <span className="flex items-center gap-0.5">
                    <Flame size={10} aria-hidden="true" />
                    {entry.streak}d
                  </span>
                )}
                {entry.badges !== undefined && (
                  <span className="flex items-center gap-0.5">
                    <Trophy size={10} aria-hidden="true" />
                    {entry.badges}
                  </span>
                )}
              </div>
            )}
          </motion.div>
        );
      })}
    </motion.div>
  );
}
