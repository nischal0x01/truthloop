/**
 * LeaderboardRow — single entry in a ranked list.
 *
 * Visual structure:
 *   ┌─────────────────────────────────────────────────────┐
 *   │ [RankMedal] [Avatar]  Name              Points       │
 *   │              streak/badge subline                    │
 *   └─────────────────────────────────────────────────────┘
 *
 * The current user's row gets a pulsing yellow ring + glow.
 * Hover lifts the whole row with a shadow expansion.
 * Entrance is a staggered slide-from-left with blur.
 *
 * Pure presentation; the page passes in everything.
 */

import { Flame, Trophy } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { UserAvatar } from '@/components/auth/UserAvatar';
import { EASE } from '@/lib/motion';
import { RankMedal } from './RankMedal';

interface LeaderboardRowProps {
  rank: number;
  name: string;
  avatar: string | null;
  points: number;
  streak?: number;
  badges?: number;
  isCurrentUser?: boolean;
  index?: number;
}

export function LeaderboardRow({
  rank,
  name,
  avatar,
  points,
  streak,
  badges,
  isCurrentUser,
  index = 0,
}: LeaderboardRowProps) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      layout
      initial={reduce ? false : { opacity: 0, x: -20, filter: 'blur(6px)' }}
      animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.5, ease: EASE, delay: Math.min(index * 0.05, 0.5) }}
      whileHover={reduce ? undefined : { y: -2 }}
      className={[
        'group relative flex items-center gap-4 overflow-hidden rounded-lg border-2 border-black p-4 transition-shadow duration-300',
        isCurrentUser
          ? 'bg-yellow shadow-hard ring-2 ring-black ring-offset-2'
          : 'bg-card shadow-hard-sm hover:shadow-hard',
      ].join(' ')}
    >
      {/* Pulsing aura behind the current-user row */}
      {isCurrentUser && (
        <motion.span
          aria-hidden
          animate={{ opacity: [0.35, 0.6, 0.35] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute inset-0 -z-10 bg-yellow/30 blur-md"
        />
      )}

      <RankMedal rank={rank} animated={index < 3} />

      <UserAvatar
        src={avatar}
        name={name}
        size={40}
        className="border-2 border-black"
        fallbackClassName="bg-pink-accent text-black"
      />

      <div className="min-w-0 flex-1">
        <p className="truncate text-label font-semibold">
          {name}
          {isCurrentUser && (
            <span className="ml-2 inline-flex items-center gap-1 text-label-small text-foreground/80">
              <span aria-hidden className="size-1.5 rounded-full bg-black" />
              you
            </span>
          )}
        </p>
        <div className="mt-0.5 flex items-center gap-3 text-label-small text-muted-foreground">
          {streak !== undefined && (
            <span className="flex items-center gap-1">
              <Flame size={12} aria-hidden="true" />
              {streak} day streak
            </span>
          )}
          {badges !== undefined && (
            <span className="flex items-center gap-1">
              <Trophy size={12} aria-hidden="true" />
              {badges} badges
            </span>
          )}
        </div>
      </div>

      <div className="text-right">
        <motion.p
          key={points}
          initial={reduce ? false : { scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 14, stiffness: 240 }}
          className="font-display text-heading-3 font-bold tabular-nums"
        >
          {points.toLocaleString()}
        </motion.p>
        <p className="text-label-small text-muted-foreground">points</p>
      </div>
    </motion.div>
  );
}
