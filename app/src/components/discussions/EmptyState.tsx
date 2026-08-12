/**
 * EmptyState — shown when the discussions list has zero posts.
 *
 * Visual: card with a brand-pink ambient orb behind, a floating MessageCircle
 * icon (gentle y + rotate wobble), and a CTA button that uses the
 * button-in-button pattern (well — here just a Plus icon, no nested circle,
 * to keep it simple). Hover lifts the card.
 */

import { MessageCircle, Plus } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { EASE } from '@/lib/motion';

interface EmptyStateProps {
  onCreate: () => void;
}

export function EmptyState({ onCreate }: EmptyStateProps) {
  const reduce = useReducedMotion();

  return (
    <div className="relative overflow-hidden rounded-lg border-2 border-black bg-card p-10 text-center shadow-hard">
      {/* Ambient orb — fixed, pointer-events-none, no scroll repaint */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-pink-accent/15 blur-3xl"
      />
      <motion.div
        aria-hidden
        animate={{ y: [0, -4, 0], rotate: [0, 3, -3, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        className="relative mx-auto grid size-14 place-items-center rounded-lg border-2 border-black bg-accent shadow-hard"
      >
        <MessageCircle size={26} aria-hidden="true" />
      </motion.div>
      <p className="relative mt-4 font-display text-heading-3 font-semibold">No discussions yet</p>
      <p className="relative mt-2 text-label text-foreground/70">
        Be the first to start a conversation!
      </p>
      <motion.button
        type="button"
        onClick={onCreate}
        whileHover={reduce ? undefined : { scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        transition={{ duration: 0.25, ease: EASE }}
        className="group relative mt-5 inline-flex items-center gap-2 rounded-lg border-2 border-black bg-accent px-4 py-2 text-label font-semibold text-accent-foreground shadow-hard transition-[box-shadow,translate] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-x-0 active:translate-y-0 active:shadow-hard"
      >
        <Plus size={15} aria-hidden="true" />
        Start a Discussion
      </motion.button>
    </div>
  );
}
