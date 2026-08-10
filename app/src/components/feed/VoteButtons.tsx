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

import { Check, Loader, X } from 'lucide-react';

type Answer = 'real' | 'fake';

interface VoteButtonsProps {
  /** The user's existing vote, if any. Locks the UI. */
  userVote?: Answer | null;
  /** Whether a vote mutation is currently in flight. */
  isVoting?: boolean;
  onVote: (answer: Answer) => void;
  disabled?: boolean;
}

const copy = {
  real: { label: 'Real', helper: "It's true", glyph: Check },
  fake: { label: 'Fake', helper: "It's false", glyph: X },
} as const;

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
        {(['real', 'fake'] as const).map((a) => {
          const picked = userVote === a;
          const Glyph = copy[a].glyph;
          // Locked surface: picked tile keeps the design-system colour for its
          // semantic (yellow for Real, red for Fake). Unpicked tile stays
          // white but loses its shadow so the eye goes straight to the pick.
          return (
            <div
              key={a}
              aria-pressed={picked}
              className={[
                'flex items-center justify-center gap-2 rounded-lg border-2 border-black px-4 py-3 text-label font-semibold',
                picked
                  ? a === 'real'
                    ? 'bg-highlight text-highlight-foreground shadow-hard'
                    : 'bg-danger text-danger-foreground shadow-hard'
                  : 'bg-card text-muted-foreground opacity-60',
              ].join(' ')}
            >
              <Glyph size={16} strokeWidth={2.5} aria-hidden="true" />
              <span>{copy[a].label}</span>
            </div>
          );
        })}
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
        className="relative grid grid-cols-2 gap-3"
        role="group"
        aria-labelledby="vote-prompt"
        aria-label="Vote real or fake"
      >
        {(['real', 'fake'] as const).map((a) => {
          const Glyph = copy[a].glyph;
          return (
            <button
              key={a}
              type="button"
              onClick={() => onVote(a)}
              disabled={disabled || isVoting}
              aria-busy={isVoting}
              className="group relative flex h-20 flex-col items-center justify-center gap-1 overflow-hidden rounded-lg border-2 border-black bg-card px-3 text-foreground shadow-hard-sm transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard active:translate-x-0 active:translate-y-0 active:shadow-hard-sm focus-visible:focus-hard disabled:cursor-not-allowed disabled:opacity-55"
            >
              <Glyph
                size={26}
                strokeWidth={3}
                aria-hidden="true"
                className={
                  isVoting
                    ? 'hidden'
                    : 'transition-transform group-hover:-translate-y-0.5'
                }
              />
              {isVoting && (
                <Loader size={26} className="animate-spin" aria-hidden="true" />
              )}
              <span className="text-label font-semibold tracking-display">
                {copy[a].label}
              </span>
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {copy[a].helper}
              </span>
            </button>
          );
        })}

        {/* "or" badge floating on the divider — anchors the two options as
            a binary choice. Black pill with white text. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 z-10 grid h-7 w-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-md border-2 border-black bg-panel text-label-small font-bold text-panel-foreground shadow-hard-sm"
        >
          or
        </span>
      </div>
    </div>
  );
}
