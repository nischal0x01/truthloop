/**
 * ClaimCard — single claim in the feed.
 *
 * Structure (top → bottom):
 *   ┌─────────────────────────────────────────────────┐
 *   │ CATEGORY TILE     3m ago · 1,204 votes          │  ← header strip
 *   │  📋                                                 (icon · label · meta)
 *   │                                                 │
 *   │ "The actual claim text in a larger, bolder     │  ← the question
 *   │  display voice — the thing the user reads       │
 *   │  before they vote."                             │
 *   │                                                 │
 *   │  ┌─────────────┐  ┌─────────────┐               │  ← vote UI (or verdict)
 *   │  │ ✓  REAL     │  │ ✕  FAKE     │               │
 *   │  └─────────────┘  └─────────────┘               │
 *   └─────────────────────────────────────────────────┘
 *
 * Variants:
 *   - default  : flat shadow-hard, 5px-meta strip
 *   - featured : user's next unvoted claim — pink ring, "YOUR TURN" badge,
 *                bigger shadow, slight scale lift
 *   - active   : currently open in the detail panel
 *   - compact  : when the feed is the narrow column beside the docked panel;
 *                hides the inline verdict reveal (the panel shows it in full)
 *
 * Pre-vote: vote buttons render inline.
 * Post-vote: a full-width colored verdict band replaces the vote buttons.
 *
 * Pure presentation — parent owns the mutation. Receives `isVoting` for the
 * spinner state and `onVote(answer)` to fire the mutation.
 */

/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V4 */

import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Check,
  ExternalLink,
  MessageCircle,
  Sparkles,
  Trophy,
  X,
} from 'lucide-react';
import { CategoryPill } from './CategoryPill';
import { VoteButtons } from './VoteButtons';
import {
  CATEGORY_META,
  truncateClaim,
  timeAgo,
  type Claim,
  type ClaimVerdict,
  type UserGuessMap,
} from '@/lib/claims';

interface ClaimCardProps {
  claim: Claim;
  userGuess?: UserGuessMap[string];
  isVoting?: boolean;
  onVote: (answer: ClaimVerdict) => void;
  /** Open this claim in the detail panel. When set, the card becomes clickable. */
  onOpen?: () => void;
  /** Highlights the card as the one currently shown in the panel. */
  isActive?: boolean;
  /**
   * Featured mode: marks this as the user's next unvoted claim so they can
   * see at a glance what to do next. Adds a pink border + "YOUR TURN" badge
   * and a slightly heavier shadow. Used together with the feed's sort.
   */
  featured?: boolean;
  /**
   * Compact mode: used when the feed is a narrow column beside the docked
   * panel. Hides the inline verdict reveal (the panel shows it in full) so the
   * list stays scannable.
   */
  compact?: boolean;
}

export function ClaimCard({
  claim,
  userGuess,
  isVoting,
  onVote,
  onOpen,
  isActive = false,
  featured = false,
  compact = false,
}: ClaimCardProps) {
  const navigate = useNavigate();
  const locked = !!userGuess;

  return (
    <article
      className={[
        'group relative rounded-lg border-2 border-black bg-card overflow-hidden transition-all',
        // Active + featured both lift the shadow. Featured is the louder lift
        // (pink ring + bigger shadow); active is the gentler "you're here" cue.
        featured
          ? 'shadow-hard-lg ring-2 ring-accent'
          : isActive
            ? 'shadow-hard-lg -translate-y-0.5 ring-2 ring-accent'
            : 'shadow-hard',
        onOpen ? 'cursor-pointer hover:-translate-y-0.5' : '',
      ].join(' ')}
      aria-labelledby={`claim-${claim.id}-text`}
      aria-current={isActive ? 'true' : undefined}
      // Clicking anywhere opens the panel. Interactive children (vote buttons,
      // links) call stopPropagation so they don't also trigger this.
      onClick={onOpen}
      tabIndex={onOpen ? 0 : undefined}
      role={onOpen ? 'button' : undefined}
      onKeyDown={
        onOpen
          ? (e) => {
              if (e.target !== e.currentTarget) return;
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onOpen();
              }
            }
          : undefined
      }
    >
      {/* ── "YOUR TURN" badge (featured only) ── */}
      {featured && !locked && (
        <div
          className="absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-md border-2 border-black bg-accent px-2 py-1 text-label-small font-bold uppercase tracking-wider text-accent-foreground shadow-hard-sm"
          aria-label="Your next claim to vote on"
        >
          <Sparkles size={11} strokeWidth={2.5} aria-hidden="true" />
          <span>Your turn</span>
        </div>
      )}

      {/* ── Header: category tile + meta ── */}
      <header className="flex items-center justify-between gap-3 border-b-2 border-black px-5 py-3">
        <CategoryPill category={claim.category} />
        <span className="flex items-center gap-2 text-label-small font-medium text-foreground/70">
          <span>{timeAgo(claim.publishedAt ?? claim.createdAt)}</span>
          <span aria-hidden="true">·</span>
          <span>
            {claim.voteCount.toLocaleString()} {claim.voteCount === 1 ? 'vote' : 'votes'}
          </span>
        </span>
      </header>

      {/* ── Body: claim text + vote/verdict ── */}
      <div className="px-5 py-5">
        <h3
          id={`claim-${claim.id}-text`}
          className="font-display text-heading-2 font-medium leading-snug tracking-body text-foreground"
          style={{ overflowWrap: 'anywhere' }}
        >
          &ldquo;{truncateClaim(claim.text)}&rdquo;
        </h3>

        {/* ── Vote UI (or verdict reveal) ── */}
        <div className="mt-5" onClick={(e) => e.stopPropagation()}>
          {!locked ? (
            <VoteButtons isVoting={isVoting} onVote={onVote} />
          ) : compact ? (
            <CompactVerdict claim={claim} userGuess={userGuess!} />
          ) : (
            <VerdictReveal claim={claim} userGuess={userGuess!} />
          )}
        </div>
      </div>

      {/* ── Footer meta ── */}
      <footer className="flex items-center justify-between gap-3 border-t-2 border-black bg-muted px-5 py-2.5 text-label-small font-medium text-foreground/70">
        <span>From the TruthLoop editors</span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (onOpen) onOpen();
            else navigate(`/claim/${claim.id}`);
          }}
          className="flex items-center gap-1 hover:text-foreground"
          aria-label="Discuss this claim"
        >
          <MessageCircle size={14} aria-hidden="true" />
          <span>Discuss</span>
        </button>
      </footer>
    </article>
  );
}

/* ── Compact verdict badge (split-view feed column) ── */

function CompactVerdict({
  claim,
  userGuess,
}: {
  claim: Claim;
  userGuess: NonNullable<ClaimCardProps['userGuess']>;
}) {
  const isCorrect = userGuess.correct;
  const VerdictGlyph = isCorrect ? Trophy : AlertTriangle;
  return (
    <div
      className={[
        'flex items-center gap-2 rounded-md border-2 border-black px-3 py-2 text-label font-semibold',
        isCorrect
          ? 'bg-highlight text-highlight-foreground'
          : 'bg-danger text-danger-foreground',
      ].join(' ')}
      role="status"
    >
      <VerdictGlyph size={14} strokeWidth={2.5} aria-hidden="true" />
      <span>
        You said <strong className="uppercase">{userGuess.answer}</strong> —{' '}
        {isCorrect ? 'correct' : `it was ${claim.verdict}`}
      </span>
      <span className="ml-auto whitespace-nowrap underline underline-offset-2">
        Details →
      </span>
    </div>
  );
}

/* ── Verdict reveal (post-vote, full size) ── */

function VerdictReveal({
  claim,
  userGuess,
}: {
  claim: Claim;
  userGuess: NonNullable<ClaimCardProps['userGuess']>;
}) {
  const isCorrect = userGuess.correct;
  return (
    <div className="space-y-4">
      {/* Full-width verdict band. The headline is the most prominent thing on
          the card — this is the moment of truth. */}
      <div
        className={[
          'rounded-md border-2 border-black px-5 py-4 text-center',
          isCorrect ? 'bg-highlight text-highlight-foreground' : 'bg-danger text-danger-foreground',
        ].join(' ')}
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center justify-center gap-2">
          {isCorrect ? (
            <Trophy size={20} strokeWidth={2.5} aria-hidden="true" />
          ) : (
            <AlertTriangle size={20} strokeWidth={2.5} aria-hidden="true" />
          )}
          <p className="text-heading-3 font-semibold tracking-display">
            {isCorrect ? (
              <>
                Correct! <span className="text-label font-semibold">+10 pts</span>
              </>
            ) : (
              <>
                Wrong — it was <strong className="uppercase">{claim.verdict}</strong>
              </>
            )}
          </p>
        </div>
        <p className="mt-1 text-label-small font-medium uppercase tracking-wider opacity-90">
          You said <strong className="uppercase">{userGuess.answer}</strong>
        </p>
      </div>

      {/* Verdict pill + explanation */}
      <div className="rounded-md border-2 border-black bg-background p-4">
        <div className="mb-2 flex items-center gap-2">
          <span
            className={[
              'inline-flex items-center gap-1 rounded-md border-2 border-black px-2 py-0.5 text-label-small font-bold uppercase tracking-wider',
              claim.verdict === 'real'
                ? 'bg-card text-foreground'
                : 'bg-danger text-danger-foreground',
            ].join(' ')}
          >
            {claim.verdict === 'real' ? (
              <>
                <Check size={11} strokeWidth={3} aria-hidden="true" /> Real
              </>
            ) : (
              <>
                <X size={11} strokeWidth={3} aria-hidden="true" /> Fake
              </>
            )}
          </span>
          <span className="text-label-small font-medium text-foreground/70">
            {CATEGORY_META[claim.category].label}
          </span>
        </div>
        <p className="text-label leading-relaxed text-foreground/90">{claim.explanation}</p>

        {claim.sourceUrl && (
          <a
            href={claim.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1 text-label-small font-medium text-foreground underline underline-offset-4 hover:text-accent-foreground"
          >
            <ExternalLink size={12} aria-hidden="true" />
            Source
          </a>
        )}
      </div>
    </div>
  );
}

/* ── Loading skeleton ── */

export function ClaimCardSkeleton() {
  return (
    <div className="border-2 border-black rounded-lg bg-card shadow-hard overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b-2 border-black px-5 py-3">
        <div className="h-6 w-28 animate-pulse rounded bg-muted" />
        <div className="h-4 w-20 animate-pulse rounded bg-muted" />
      </div>
      <div className="space-y-3 px-5 py-5">
        <div className="h-6 w-full animate-pulse rounded bg-muted" />
        <div className="h-6 w-5/6 animate-pulse rounded bg-muted" />
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="h-20 animate-pulse rounded bg-muted" />
          <div className="h-20 animate-pulse rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}
