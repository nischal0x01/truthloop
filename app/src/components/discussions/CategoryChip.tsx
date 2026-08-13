/**
 * CategoryChip — premium pill toggle used in the discussions toolbar.
 *
 * Two-tier structure (button-in-button principle):
 *   - Outer pill: border-2 black, active fills with pink-accent, inactive stays bg-card
 *   - Active state animates the inner dot (scale 0 → 1 with spring)
 *
 * Used in the toolbar band. Renders 5-6 chips horizontally.
 */

import { motion, useReducedMotion } from 'motion/react';
import { EASE } from '@/lib/motion';

interface CategoryChipProps {
  label: string;
  active: boolean;
  count?: number;
  icon?: React.ReactNode;
  onClick: () => void;
}

export function CategoryChip({ label, active, count, icon, onClick }: CategoryChipProps) {
  const reduce = useReducedMotion();

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={reduce ? undefined : { y: -1 }}
      whileTap={{ scale: 0.96 }}
      transition={{ duration: 0.2, ease: EASE }}
      aria-pressed={active}
      className={[
        'group inline-flex items-center gap-1.5 rounded-full border-2 border-black px-3.5 py-1.5 text-label-small font-semibold',
        'transition-[box-shadow,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
        active
          ? 'bg-pink-accent text-accent-foreground shadow-hard-sm'
          : 'bg-card text-foreground hover:shadow-hard-sm',
      ].join(' ')}
    >
      {icon && (
        <span
          aria-hidden
          className={[
            'transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
            active ? 'scale-110' : 'group-hover:scale-110',
          ].join(' ')}
        >
          {icon}
        </span>
      )}
      <span>{label}</span>
      {typeof count === 'number' && (
        <span
          className={[
            'rounded-full border border-black/30 px-1.5 text-[10px] tabular-nums',
            active ? 'bg-black/15' : 'bg-black/5',
          ].join(' ')}
        >
          {count}
        </span>
      )}
      {active && (
        <motion.span
          layoutId="chip-active-dot"
          aria-hidden
          className="size-1.5 rounded-full bg-black"
          transition={reduce ? { duration: 0 } : { type: 'spring', damping: 18, stiffness: 320 }}
        />
      )}
    </motion.button>
  );
}