/**
 * VoteSlider — horizontal slider showing community vote distribution.
 *
 * Displays Real vs Fake votes as a split bar with:
 * - Green section for Real votes (left side)
 * - Pink section for Fake votes (right side)
 * - User's vote is highlighted with a marker
 * - Percentages and counts displayed
 *
 * Design: Gumroad hard-edge aesthetic — no blur, sharp colors,
 * uses brand colors (green for Real, pink for Fake).
 */

import { motion } from 'motion/react';
import { Check, X } from 'lucide-react';

interface VoteSliderProps {
  realCount: number;
  fakeCount: number;
  userVote?: 'real' | 'fake' | null;
}

export function VoteSlider({
  realCount,
  fakeCount,
  userVote,
}: VoteSliderProps) {
  const total = realCount + fakeCount;
  if (total === 0) return null;

  const realPct = Math.round((realCount / total) * 100);
  const fakePct = 100 - realPct;

  return (
    <div className="space-y-3">
      {/* Slider bar */}
      <div className="relative">
        {/* Background track */}
        <div className="h-8 rounded-lg border-2 border-black bg-muted overflow-hidden">
          <div className="flex h-full">
            {/* Real section (green) */}
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${realPct}%` }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center justify-center bg-real border-r border-black/20"
            >
              {realPct > 15 && (
                <span className="flex items-center gap-1 text-label-small font-bold text-white">
                  <Check size={12} strokeWidth={3} />
                  {realPct}%
                </span>
              )}
            </motion.div>

            {/* Fake section (pink) */}
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${fakePct}%` }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
              className="flex items-center justify-center bg-fake"
            >
              {fakePct > 15 && (
                <span className="flex items-center gap-1 text-label-small font-bold text-white">
                  <X size={12} strokeWidth={3} />
                  {fakePct}%
                </span>
              )}
            </motion.div>
          </div>
        </div>

        {/* User vote marker */}
        {userVote && (
          <div
            className="absolute -top-1 transform"
            style={{
              [userVote === 'real' ? 'left' : 'right']: userVote === 'real'
                ? `calc(${realPct}% - 12px)`
                : `calc(${fakePct}% - 12px)`,
            }}
          >
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4, type: 'spring', damping: 15 }}
              className={[
                'rounded-full border-2 border-black px-2 py-0.5 text-label-small font-bold shadow-hard-sm',
                userVote === 'real'
                  ? 'bg-real text-white'
                  : 'bg-fake text-white',
              ].join(' ')}
            >
              You
            </motion.div>
          </div>
        )}
      </div>

      {/* Legend below */}
      <div className="flex justify-between text-label-small">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-real border border-black" />
          <span className="font-medium">Real</span>
          <span className="text-muted-foreground">
            {realCount.toLocaleString()} votes
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">
            {fakeCount.toLocaleString()} votes
          </span>
          <span className="font-medium">Fake</span>
          <div className="h-3 w-3 rounded-full bg-fake border border-black" />
        </div>
      </div>
    </div>
  );
}
