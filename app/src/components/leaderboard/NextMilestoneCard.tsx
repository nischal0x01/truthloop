/**
 * NextMilestoneCard — sidebar card showing the user's progress toward
 * upcoming rewards (next rank tier + next badge).
 *
 * Each milestone row:
 *   - Label + "X pts away" on the right
 *   - Animated progress bar (0 → width% on mount, with a tiny spring)
 *   - Different accent colour per milestone (pink for rank, yellow for gold)
 *
 * Footer shows current streak with a wiggling flame.
 */

import { Flame, Medal, TrendingUp } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { EASE } from '@/lib/motion';

interface Milestone {
  /** Visible label. May include JSX (e.g. icon + text). */
  label: React.ReactNode;
  pointsAway: number;
  /** 0..1 fill ratio of the bar. */
  progress: number;
  /** Bar fill colour. */
  barClass: string;
}

interface NextMilestoneCardProps {
  milestones: Milestone[];
  currentStreakDays: number;
}

export function NextMilestoneCard({ milestones, currentStreakDays }: NextMilestoneCardProps) {
  const reduce = useReducedMotion();

  return (
    <motion.section
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE, delay: 0.15 }}
      className="rounded-lg border-2 border-black bg-accent/5 p-6 shadow-hard"
      aria-label="Next milestone"
    >
      <div className="mb-4 flex items-center gap-2">
        <TrendingUp size={20} className="text-accent" aria-hidden="true" />
        <h3 className="font-display text-heading-3 font-semibold">Next Milestone</h3>
      </div>

      <div className="space-y-4">
        {milestones.map((m, i) => (
          <motion.div
            key={i}
            initial={reduce ? false : { opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, ease: EASE, delay: 0.25 + i * 0.1 }}
          >
            <div className="flex items-center justify-between text-label-small">
              <span className="flex items-center gap-1">{m.label}</span>
              <span className="font-semibold tabular-nums">{m.pointsAway} pts away</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full border border-black bg-muted">
              <motion.div
                initial={{ width: '0%' }}
                animate={{ width: `${Math.round(m.progress * 100)}%` }}
                transition={{ duration: 1, ease: EASE, delay: 0.4 + i * 0.1, type: 'spring', damping: 18 }}
                className={['h-full', m.barClass].join(' ')}
              />
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        className="mt-5 flex items-center justify-between border-t border-black/20 pt-4"
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease: EASE, delay: 0.6 }}
      >
        <span className="text-label-small text-muted-foreground">Current streak</span>
        <span className="flex items-center gap-1.5 font-display text-heading-3 font-bold tabular-nums">
          <motion.span
            aria-hidden
            animate={{ rotate: [0, -8, 8, 0], scale: [1, 1.15, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Flame size={16} className="text-orange" aria-hidden="true" />
          </motion.span>
          {currentStreakDays} days
        </span>
      </motion.div>
    </motion.section>
  );
}

export const DEFAULT_MILESTONES: Milestone[] = [
  {
    label: 'Top 10 Daily',
    pointsAway: 38,
    progress: 0.85,
    barClass: 'bg-accent',
  },
  {
    label: (
      <span className="flex items-center gap-1">
        <Medal size={10} className="text-yellow" aria-hidden="true" />
        Gold Badge
      </span>
    ),
    pointsAway: 120,
    progress: 0.6,
    barClass: 'bg-yellow',
  },
];

