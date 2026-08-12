/**
 * RankMedal — circular badge for a row's position (1 / 2 / 3 / 4+).
 *
 *   1 → yellow + Medal icon
 *   2 → neutral + Medal icon
 *   3 → orange + Medal icon
 *   4+ → plain card with the rank number
 *
 * For the top-3 medals, when `animated` is true (used inside Podium),
 * the icon does a continuous wiggle and the badge gets a spring scale-in.
 */

import { Crown, Medal } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { EASE } from '@/lib/motion';

interface RankMedalProps {
  rank: number;
  /** Whether to apply the top-3 entrance + icon wiggle. Podium uses true. */
  animated?: boolean;
  /** When true, render at the smaller row size (32px) instead of podium size. */
  size?: 'sm' | 'md' | 'lg';
}

export function RankMedal({ rank, animated = false, size = 'md' }: RankMedalProps) {
  const reduce = useReducedMotion();

  // Size mapping — podium uses lg (44px), row uses md (32px)
  const sizeClasses =
    size === 'lg'
      ? 'size-11'
      : size === 'sm'
        ? 'size-7'
        : 'size-8';
  const iconSize = size === 'lg' ? 20 : 16;

  // Top-3 podium treatment
  if (rank === 1) {
    return (
      <motion.span
        initial={animated ? { scale: 0, rotate: -180 } : false}
        animate={animated ? { scale: 1, rotate: 0 } : undefined}
        transition={{ type: 'spring', damping: 12, stiffness: 220, delay: 0.1 }}
        className={`relative grid ${sizeClasses} place-items-center rounded-full border-2 border-black bg-yellow shadow-hard-sm`}
        aria-label="First place"
      >
        <motion.span
          aria-hidden
          animate={animated ? { rotate: [0, -10, 10, 0], y: [0, -2, 0] } : undefined}
          transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
          className="text-black"
        >
          <Crown size={iconSize} strokeWidth={2.5} aria-hidden="true" />
        </motion.span>
        {!reduce && animated && (
          <motion.span
            aria-hidden
            className="absolute inset-0 rounded-full border-2 border-black"
            initial={{ opacity: 0.5, scale: 1 }}
            animate={{ opacity: 0, scale: 1.6 }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
          />
        )}
      </motion.span>
    );
  }

  if (rank === 2) {
    return (
      <motion.span
        initial={animated ? { scale: 0, rotate: 180 } : false}
        animate={animated ? { scale: 1, rotate: 0 } : undefined}
        transition={{ type: 'spring', damping: 12, stiffness: 220, delay: 0.05 }}
        className={`grid ${sizeClasses} place-items-center rounded-full border-2 border-black bg-muted shadow-hard-sm`}
        aria-label="Second place"
      >
        <Medal size={iconSize} className="text-black" aria-hidden="true" />
      </motion.span>
    );
  }

  if (rank === 3) {
    return (
      <motion.span
        initial={animated ? { scale: 0, rotate: 180 } : false}
        animate={animated ? { scale: 1, rotate: 0 } : undefined}
        transition={{ type: 'spring', damping: 12, stiffness: 220, delay: 0.15 }}
        className={`grid ${sizeClasses} place-items-center rounded-full border-2 border-black bg-orange shadow-hard-sm`}
        aria-label="Third place"
      >
        <Medal size={iconSize} className="text-black" aria-hidden="true" />
      </motion.span>
    );
  }

  // Plain rank number for positions 4+
  return (
    <span
      className={`grid ${sizeClasses} place-items-center rounded-full border-2 border-black bg-card text-label-small font-bold tabular-nums`}
    >
      {rank}
    </span>
  );
}

// Re-export EASE for consumers that might import it from here.
export { EASE };
