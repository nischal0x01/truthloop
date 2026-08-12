/**
 * YourRankCard — sidebar card showing the signed-in user's current standing.
 *
 * Visual:
 *   - Star icon chip at the top
 *   - Big animated rank count-up ("#42")
 *   - Stats underneath: claims voted + accuracy %
 *   - Brand-pink ambient orb in the corner
 *
 * Currently uses hardcoded values; swap to API data once a /me/rank
 * endpoint exists.
 */

import { Star } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { EASE } from '@/lib/motion';

interface YourRankCardProps {
  /** Rank number (1 = first place). Use 0 to hide. */
  rank: number;
  /** Total claims the user has voted on. */
  claimsVoted: number;
  /** Accuracy as 0..1 (e.g. 0.71 = 71%). */
  accuracy: number;
  /** Label for which leaderboard the rank belongs to. */
  leaderboardLabel?: string;
}

export function YourRankCard({
  rank,
  claimsVoted,
  accuracy,
  leaderboardLabel = 'Daily Leaderboard',
}: YourRankCardProps) {
  const reduce = useReducedMotion();

  return (
    <motion.section
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE }}
      className="relative overflow-hidden rounded-lg border-2 border-black bg-accent/10 p-6 shadow-hard"
      aria-label="Your rank"
    >
      {/* Ambient orb */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-12 size-44 rounded-full bg-pink-accent/20 blur-3xl"
      />

      <div className="relative mb-4 flex items-center gap-2">
        <motion.span
          aria-hidden
          animate={{ rotate: [0, 12, -12, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
          className="grid size-7 place-items-center rounded-md border-2 border-black bg-accent text-accent-foreground"
        >
          <Star size={14} aria-hidden="true" />
        </motion.span>
        <h3 className="font-display text-heading-3 font-semibold">Your Rank</h3>
      </div>

      <div className="relative text-center">
        <motion.p
          initial={reduce ? false : { scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 12, stiffness: 240, delay: 0.2 }}
          className="font-display text-display-small font-bold tabular-nums"
        >
          #{rank}
        </motion.p>
        <p className="text-label text-muted-foreground">{leaderboardLabel}</p>
        <div className="mt-4 border-t border-black/20 pt-4">
          <p className="text-label-small text-muted-foreground">You&apos;ve voted on</p>
          <motion.p
            initial={reduce ? false : { scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: EASE, delay: 0.35 }}
            className="font-display text-heading-3 font-bold tabular-nums"
          >
            {claimsVoted} claims
          </motion.p>
          <p className="text-label-small text-muted-foreground">
            with{' '}
            <span className="font-semibold text-foreground">
              {Math.round(accuracy * 100)}%
            </span>{' '}
            accuracy
          </p>
        </div>
      </div>
    </motion.section>
  );
}
