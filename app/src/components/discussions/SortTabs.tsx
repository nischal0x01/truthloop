/**
 * SortTabs — Hot / New / Top selector for the discussions list.
 *
 * Premium treatment:
 *   - Outer pill: 2px black border, bg-muted/40, shadow-hard-sm
 *   - Active tab gets a pink pill that slides between positions (layoutId)
 *   - Spring-physics slide, label slightly darker when active
 *   - Tab icons animate scale on hover
 */

import { Award, Clock, TrendingUp } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import type { SortOrder } from '@/actions/discussions';
import { EASE } from '@/lib/motion';

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
      className="relative inline-flex items-center gap-1 rounded-full border-2 border-black bg-muted/40 p-1 shadow-hard-sm"
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
            className="relative z-10 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-label-small font-semibold transition-colors duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
          >
            {isActive && (
              <motion.span
                layoutId="sort-active-pill"
                className="absolute inset-0 -z-10 rounded-full border-2 border-black bg-pink-accent shadow-hard-sm"
                transition={reduce ? { duration: 0 } : { type: 'spring', damping: 22, stiffness: 320 }}
              />
            )}
            <span
              className={[
                'relative z-10 inline-flex items-center gap-1.5 transition-colors',
                isActive ? 'text-black' : 'text-foreground/70',
              ].join(' ')}
            >
              <motion.span
                aria-hidden
                whileHover={reduce ? undefined : { rotate: isActive ? 0 : -8, scale: 1.1 }}
                transition={{ duration: 0.25, ease: EASE }}
                className="inline-flex"
              >
                {opt.icon}
              </motion.span>
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}