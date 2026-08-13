/**
 * EmptyState — shown when the discussions list has zero posts.
 *
 * Editorial treatment: oversized type "Quiet for now." with massive heading,
 * layered ambient orbs (pink + yellow), floating chat icon, and a CTA pill.
 *
 * Visual layers:
 *   1. Soft Structuralism card (white + 2px black border + offset shadow)
 *   2. Double ambient orbs (pink right, yellow bottom-left)
 *   3. Floating MessageCircle with wobble
 *   4. Display-XL headline
 *   5. Subhead
 *   6. CTA pill (button-in-button: nested Plus circle)
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
    <div className="relative overflow-hidden rounded-[2rem] border-2 border-black bg-card p-10 text-center shadow-hard sm:p-14">
      {/* Ambient orbs — fixed in this card, pointer-events-none, no scroll repaint */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-pink-accent/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -left-16 size-64 rounded-full bg-yellow/30 blur-3xl"
      />

      {/* Floating icon */}
      <motion.div
        aria-hidden
        animate={
          reduce
            ? undefined
            : { y: [0, -6, 0], rotate: [0, 4, -4, 0] }
        }
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        className="relative mx-auto grid size-16 place-items-center rounded-2xl border-2 border-black bg-accent shadow-hard"
      >
        <MessageCircle size={30} aria-hidden="true" />
        <span className="absolute -right-2 -top-2 grid size-7 place-items-center rounded-full border-2 border-black bg-yellow text-[10px] font-bold">
          0
        </span>
      </motion.div>

      <motion.h2
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE, delay: 0.1 }}
        className="relative mt-6 font-display text-display-medium font-bold leading-[0.95] tracking-display"
      >
        Quiet for now.
      </motion.h2>

      <motion.p
        initial={reduce ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE, delay: 0.25 }}
        className="relative mx-auto mt-3 max-w-md text-body-large leading-body-large text-foreground/70"
      >
        No discussions yet. Be the first to start a conversation — drop a
        claim, ask the room a question, or share what fooled you this week.
      </motion.p>

      <motion.button
        type="button"
        onClick={onCreate}
        initial={reduce ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE, delay: 0.4 }}
        whileHover={reduce ? undefined : { scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        className="group relative mt-6 inline-flex items-center gap-2 rounded-full border-2 border-black bg-accent px-5 py-2.5 text-label font-semibold text-accent-foreground shadow-hard transition-[box-shadow,translate] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-x-0 active:translate-y-0 active:shadow-hard"
      >
        <span
          aria-hidden
          className="grid size-7 place-items-center rounded-full border-2 border-black bg-black/10 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:rotate-90 group-hover:scale-110"
        >
          <Plus size={14} strokeWidth={2.5} aria-hidden="true" />
        </span>
        Start a Discussion
      </motion.button>
    </div>
  );
}