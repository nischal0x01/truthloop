/**
 * VoteDistributionChart — animated donut chart showing community vote split.
 *
 * Displays Real vs Fake vote proportions after the user has voted.
 * Uses pure SVG with CSS animations — no chart library required.
 *
 * Design: Gumroad hard-edge aesthetic — sharp segments, no blur,
 * uses brand colors (yellow/highlight for Real, red/danger for Fake).
 */

import { motion } from 'motion/react';
import { Check, X } from 'lucide-react';

interface VoteDistributionChartProps {
  realCount: number;
  fakeCount: number;
  userVote?: 'real' | 'fake' | null;
}

export function VoteDistributionChart({
  realCount,
  fakeCount,
  userVote,
}: VoteDistributionChartProps) {
  const total = realCount + fakeCount;
  if (total === 0) return null;

  const realPct = Math.round((realCount / total) * 100);
  const fakePct = 100 - realPct;

  // SVG donut: radius=40, circumference=2*PI*40 ≈ 251.2
  const RADIUS = 40;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const CENTER = 50;

  // Real is the "highlight" (yellow) arc starting from top (stroke-dashoffset = 0)
  // Fake is the "danger" (red) arc
  // We draw both as strokes and animate them
  const realDash = (realPct / 100) * CIRCUMFERENCE;
  const fakeDash = (fakePct / 100) * CIRCUMFERENCE;

  // Gap between segments
  const GAP = 8;
  const realOffset = GAP / 2;
  const fakeOffset = (realDash + GAP);

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Donut chart */}
      <div className="relative">
        <svg
          width="120"
          height="120"
          viewBox="0 0 100 100"
          className="transform -rotate-90"
          aria-label={`Community vote distribution: ${realPct}% real, ${fakePct}% fake`}
          role="img"
        >
          {/* Background track */}
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            stroke="#e5e5e5"
            strokeWidth="12"
          />

          {/* Real (yellow/highlight) segment */}
          <motion.circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            stroke="#f1f333"
            strokeWidth="12"
            strokeDasharray={`${realDash - GAP / 2} ${CIRCUMFERENCE}`}
            strokeDashoffset={-realOffset}
            strokeLinecap="butt"
            initial={{ strokeDasharray: `0 ${CIRCUMFERENCE}` }}
            animate={{ strokeDasharray: `${realDash - GAP / 2} ${CIRCUMFERENCE}` }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
            className="origin-center"
            style={{ transformOrigin: 'center' }}
          />

          {/* Fake (red/danger) segment */}
          <motion.circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            stroke="#dc341e"
            strokeWidth="12"
            strokeDasharray={`${fakeDash - GAP / 2} ${CIRCUMFERENCE}`}
            strokeDashoffset={-fakeOffset}
            strokeLinecap="butt"
            initial={{ strokeDasharray: `0 ${CIRCUMFERENCE}` }}
            animate={{ strokeDasharray: `${fakeDash - GAP / 2} ${CIRCUMFERENCE}` }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
            className="origin-center"
            style={{ transformOrigin: 'center' }}
          />
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-2xl font-bold tracking-display">
            {total.toLocaleString()}
          </span>
          <span className="text-label-small text-foreground/60">votes</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-6">
        <LegendItem
          color="#f1f333"
          borderColor="#000"
          label="Real"
          count={realCount}
          pct={realPct}
          icon={<Check size={12} strokeWidth={3} />}
          isUserVote={userVote === 'real'}
        />
        <LegendItem
          color="#dc341e"
          borderColor="#000"
          label="Fake"
          count={fakeCount}
          pct={fakePct}
          icon={<X size={12} strokeWidth={3} />}
          isUserVote={userVote === 'fake'}
        />
      </div>
    </div>
  );
}

function LegendItem({
  color,
  borderColor,
  label,
  count,
  pct,
  icon,
  isUserVote,
}: {
  color: string;
  borderColor: string;
  label: string;
  count: number;
  pct: number;
  icon: React.ReactNode;
  isUserVote?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={[
          'flex items-center gap-1.5 rounded-md border-2 px-2 py-1',
          isUserVote ? 'ring-2 ring-offset-1 ring-black' : '',
        ].join(' ')}
        style={{ backgroundColor: color, borderColor }}
      >
        <span style={{ color: label === 'Real' ? '#000' : '#fff' }}>{icon}</span>
        <span
          className="text-label-small font-bold"
          style={{ color: label === 'Real' ? '#000' : '#fff' }}
        >
          {label}
        </span>
      </div>
      <div className="text-center">
        <span className="font-display text-heading-3 font-bold">{pct}%</span>
        <span className="ml-1 text-label-small text-foreground/60">
          ({count.toLocaleString()})
        </span>
      </div>
    </div>
  );
}
