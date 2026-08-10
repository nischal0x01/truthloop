/**
 * VoteButtons — pair of large Real/Fake vote buttons.
 *
 * States:
 *   - idle    : both buttons clickable
 *   - voting  : buttons disabled, spinner inside the chosen one
 *   - locked  : only after a successful vote — buttons become static badges
 *               showing the user's pick
 *
 * Calls `onVote(answer)`; parent owns the mutation + cache update.
 */

import { Loader } from 'lucide-react';

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
  real: { label: 'Real', helper: "This is true" },
  fake: { label: 'Fake', helper: "This is false" },
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
          return (
            <div
              key={a}
              aria-pressed={picked}
              className={[
                'flex items-center justify-center gap-2 rounded-lg border-2 border-black px-4 py-3 text-label font-medium',
                picked
                  ? a === 'real'
                    ? 'bg-card text-foreground shadow-hard'
                    : 'bg-card text-foreground shadow-hard'
                  : 'bg-background text-muted-foreground opacity-60',
              ].join(' ')}
            >
              <span>{copy[a].label}</span>
              {picked && <span aria-hidden="true">✓</span>}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3" role="group" aria-label="Vote real or fake">
      <button
        type="button"
        onClick={() => onVote('real')}
        disabled={disabled || isVoting}
        aria-busy={isVoting}
        className="group flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-black bg-card px-4 py-3 text-foreground shadow-hard-sm transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-hard active:translate-x-0 active:translate-y-0 active:shadow-hard-sm disabled:cursor-not-allowed disabled:opacity-55"
      >
        <span className="flex items-center gap-2 text-label font-medium">
          {isVoting && <Loader size={14} className="animate-spin" aria-hidden="true" />}
          Real
        </span>
        <span className="text-xs text-muted-foreground">{copy.real.helper}</span>
      </button>

      <button
        type="button"
        onClick={() => onVote('fake')}
        disabled={disabled || isVoting}
        aria-busy={isVoting}
        className="group flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-black bg-card px-4 py-3 text-foreground shadow-hard-sm transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-hard active:translate-x-0 active:translate-y-0 active:shadow-hard-sm disabled:cursor-not-allowed disabled:opacity-55"
      >
        <span className="flex items-center gap-2 text-label font-medium">
          {isVoting && <Loader size={14} className="animate-spin" aria-hidden="true" />}
          Fake
        </span>
        <span className="text-xs text-muted-foreground">{copy.fake.helper}</span>
      </button>
    </div>
  );
}