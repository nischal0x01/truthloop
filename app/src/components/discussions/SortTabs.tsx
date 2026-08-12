/**
 * SortTabs — Hot / New / Top selector for the discussions list.
 *
 * The active tab gets a pink "pill" that slides between options using
 * `layoutId`. The pill is a motion.span that animates between positions
 * via spring physics — no JS measurement, just the shared-element pattern.
 *
 * Visual: muted container (bg-muted/40) with rounded-lg + 2px black border,
 * each tab is a transparent button with a centred icon + label.
 */

import { Award, Clock, TrendingUp } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import type { SortOrder } from '@/lib/discussions';

const SORT_OPTIONS: { value: SortOrder; label: string; icon: React.ReactNode }[] = [
  { value: 'hot', label: 'Hot', icon: <TrendingUp size={13} aria-hidden="true" /> },
  { value: 'new', label: 'New', icon: <Clock size={13} aria-hidden="true" /> },
  { value: 'top', label: 'Top', icon: <Award size={13} aria-hidden="true" /> },
];

interface SortTabsProps {
  sort: SortOrder;
  onSortChange: (s: SortOrder) => void;
}

export function SortTabs({ sort, onSortChange }: SortTabsProps) {
  const reduce = useReducedMotion();

  return (
    <div
      role="tablist"
      aria-label="Sort discussions"
      className="relative mb-5 inline-flex items-center gap-1 rounded-lg border-2 border-black bg-muted/40 p-1 shadow-hard-sm"
    >
      {SORT_OPTIONS.map((opt) => {
        const isActive = sort === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onSortChange(opt.value)}
            className="relative z-10 inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-label-small font-semibold transition-colors"
          >
            {isActive && (
              <motion.span
                layoutId="sort-active-pill"
                className="absolute inset-0 -z-10 rounded-md border-2 border-black bg-pink-accent shadow-hard-sm"
                transition={reduce ? { duration: 0 } : { type: 'spring', damping: 22, stiffness: 320 }}
              />
            )}
            <span
              className={[
                'relative z-10 inline-flex items-center gap-1.5',
                isActive ? 'text-black' : 'text-foreground/70',
              ].join(' ')}
            >
              {opt.icon}
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
