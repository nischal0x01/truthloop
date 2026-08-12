/**
 * VoteButtons — Real / Fake vote pair.
 *
 * Visual goal: instant awareness. A voter should see the question, the two
 * options, and the polarity of each option (✓ vs ✕) in one glance — no
 * reading, no hunting.
 *
 *   idle    : two large tiles with icon + label + helper, separated by a
 *             "or" badge floating on the divider. Tiles use the Gumroad
 *             shadow-hard-sm baseline and lift on hover.
 *   voting  : tiles disabled; spinner replaces the icon in the chosen tile.
 *   locked  : tiles become static badges — picked tile shows the colour it
 *             earned, the other tile fades.
 *
 * Honours `disabled` (parent overrides — e.g. signed-out visitor).
 * Parent owns the mutation + cache update.
 */

/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V4 */

import { Loader } from 'lucide-react';
import { motion } from 'motion/react';

type Answer = 'real' | 'fake';

interface VoteButtonsProps {
  /** The user's existing vote, if any. Locks the UI. */
  userVote?: Answer | null;
  /** Whether a vote mutation is currently in flight. */
  isVoting?: boolean;
  onVote: (answer: Answer) => void;
  disabled?: boolean;
}

const EASE = [0.32, 0.72, 0, 1] as const;

export function VoteButtons({
  userVote,
  isVoting = false,
  onVote,
  disabled = false,
}: VoteButtonsProps) {
  const locked = !!userVote;

  if (locked) {
    return (
      <div
        className="grid grid-cols-2 gap-3"
        role="group"
        aria-label="Your vote is locked"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, ease: EASE }}
          aria-pressed={userVote === 'real'}
          className={[
            'flex items-center justify-center gap-2 rounded-lg border-2 border-black px-4 py-3 text-label font-semibold',
            userVote === 'real'
              ? 'bg-real text-white shadow-hard'
              : 'bg-card text-muted-foreground opacity-60',
          ].join(' ')}
        >
          <span className="text-[16px] font-bold">REAL</span>
        </motion.div>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, ease: EASE, delay: 0.05 }}
          aria-pressed={userVote === 'fake'}
          className={[
            'flex items-center justify-center gap-2 rounded-lg border-2 border-black px-4 py-3 text-label font-semibold',
            userVote === 'fake'
              ? 'bg-danger text-white shadow-hard'
              : 'bg-card text-muted-foreground opacity-60',
          ].join(' ')}
        >
          <span className="text-[16px] font-bold">FAKE</span>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p
        className="text-label-small font-semibold uppercase tracking-wider text-foreground"
        id="vote-prompt"
      >
        Your call
      </p>
      <div
        className="grid grid-cols-2 gap-3"
        role="group"
        aria-labelledby="vote-prompt"
        aria-label="Vote real or fake"
      >
        <motion.button
          key="real"
          type="button"
          onClick={() => onVote('real')}
          disabled={disabled || isVoting}
          aria-busy={isVoting}
          whileHover={!disabled && !isVoting ? { scale: 1.02 } : undefined}
          whileTap={!disabled && !isVoting ? { scale: 0.97 } : undefined}
          transition={{ duration: 0.25, ease: EASE }}
          className="group relative flex h-20 flex-col items-center justify-center gap-1 overflow-hidden rounded-lg border-2 border-black bg-real px-3 text-white shadow-hard-sm transition-[box-shadow,background-color,translate] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-real/90 hover:shadow-hard active:translate-x-0 active:translate-y-0 active:shadow-hard-sm focus-visible:focus-hard disabled:cursor-not-allowed disabled:opacity-55"
        >
          {isVoting ? (
            <Loader size={22} className="animate-spin" aria-hidden="true" />
          ) : (
            <span className="text-[22px] font-bold tracking-wide" aria-hidden="true">
              REAL
            </span>
          )}
          <span className="text-[11px] font-medium uppercase tracking-wider text-white/70">
            It&apos;s true
          </span>
        </motion.button>

        <motion.button
          key="fake"
          type="button"
          onClick={() => onVote('fake')}
          disabled={disabled || isVoting}
          aria-busy={isVoting}
          whileHover={!disabled && !isVoting ? { scale: 1.02 } : undefined}
          whileTap={!disabled && !isVoting ? { scale: 0.97 } : undefined}
          transition={{ duration: 0.25, ease: EASE }}
          className="group relative flex h-20 flex-col items-center justify-center gap-1 overflow-hidden rounded-lg border-2 border-black bg-danger px-3 text-white shadow-hard-sm transition-[box-shadow,background-color,translate] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-danger/90 hover:shadow-hard active:translate-x-0 active:translate-y-0 active:shadow-hard-sm focus-visible:focus-hard disabled:cursor-not-allowed disabled:opacity-55"
        >
          {isVoting ? (
            <Loader size={22} className="animate-spin" aria-hidden="true" />
          ) : (
            <span className="text-[22px] font-bold tracking-wide" aria-hidden="true">
              FAKE
            </span>
          )}
          <span className="text-[11px] font-medium uppercase tracking-wider text-white/70">
            It&apos;s false
          </span>
        </motion.button>
      </div>
    </div>
  );
}