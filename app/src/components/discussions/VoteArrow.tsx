/**
 * VoteArrow — shared up/down arrow used in post cards + discussion comments.
 *
 * One component, four classes:
 *   - The button is always a 32px square with 2px black border.
 *   - `activeBg` + `hoverBg` decide the colour treatment per direction.
 *   - Magnetic whileHover/whileTap (spring-physics via EASE).
 *
 * Wraps lucide's ArrowUp / ArrowDown with consistent sizing.
 */

import { ArrowDown, ArrowUp } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { EASE } from '@/lib/motion';

interface VoteArrowProps {
  direction: 1 | -1;
  active: boolean;
  activeBg: string;
  hoverBg: string;
  disabled?: boolean;
  onClick: () => void;
  ariaLabel: string;
}

export function VoteArrow({
  direction,
  active,
  activeBg,
  hoverBg,
  disabled,
  onClick,
  ariaLabel,
}: VoteArrowProps) {
  const Icon = direction === 1 ? ArrowUp : ArrowDown;
  const reduce = useReducedMotion();

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-pressed={active}
      whileHover={!disabled && !reduce ? { scale: 1.08 } : undefined}
      whileTap={!disabled && !reduce ? { scale: 0.92 } : undefined}
      transition={{ duration: 0.2, ease: EASE }}
      className={[
        'grid size-8 place-items-center rounded-md border-2 border-black transition-all',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'hover:-translate-y-0.5 hover:shadow-hard-sm',
        active ? `${activeBg} shadow-hard-sm` : `bg-card ${hoverBg}`,
      ].join(' ')}
    >
      <Icon size={14} strokeWidth={2.5} aria-hidden="true" />
    </motion.button>
  );
}
