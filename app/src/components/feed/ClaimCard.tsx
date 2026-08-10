/**
 * ClaimCard — single claim in the feed.
 *
 * Pre-vote: shows category, claim text, time-ago, vote buttons.
 * Post-vote: shows the user's pick, verdict badge, explanation, source link.
 *
 * Pure presentation — parent owns the mutation. Receives `isVoting` for the
 * spinner state and `onVote(answer)` to fire the mutation.
 */

import { useNavigate } from 'react-router-dom';
import { ExternalLink, MessageCircle, Trophy, AlertTriangle } from 'lucide-react';
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
}

export function ClaimCard({ claim, userGuess, isVoting, onVote }: ClaimCardProps) {
  const navigate = useNavigate();
  const locked = !!userGuess;

  return (
    <article
      className="border-2 border-black rounded-lg bg-card shadow-hard overflow-hidden"
      aria-labelledby={`claim-${claim.id}-text`}
    >
      {/* ── Header: category + time ── */}
      <header className="flex items-center justify-between gap-3 border-b-2 border-black px-5 py-3">
        <CategoryPill category={claim.category} />
        <span className="text-label-small text-muted-foreground">
          {timeAgo(claim.publishedAt ?? claim.createdAt)}
        </span>
      </header>

      {/* ── Body: claim text ── */}
      <div className="px-5 py-5">
        <p
          id={`claim-${claim.id}-text`}
          className="text-body-large font-display font-medium leading-snug text-foreground"
          style={{ overflowWrap: 'anywhere' }}
        >
          &ldquo;{truncateClaim(claim.text)}&rdquo;
        </p>

        {/* ── Vote UI (or verdict reveal) ── */}
        <div className="mt-5">
          {!locked ? (
            <>
              <p className="mb-3 text-label-small uppercase tracking-wider text-muted-foreground">
                Your call
              </p>
              <VoteButtons isVoting={isVoting} onVote={onVote} />
            </>
          ) : (
            <VerdictReveal claim={claim} userGuess={userGuess!} />
          )}
        </div>
      </div>

      {/* ── Footer meta ── */}
      <footer className="flex items-center justify-between gap-3 border-t-2 border-black bg-muted/40 px-5 py-2.5 text-label-small text-muted-foreground">
        <span>{claim.voteCount} {claim.voteCount === 1 ? 'vote' : 'votes'}</span>
        <div className="flex items-center gap-3">
          {/* Placeholder — comments land in a later phase */}
          <button
            type="button"
            onClick={() => navigate(`/feed/${claim.id}`)}
            className="flex items-center gap-1 hover:text-foreground"
            aria-label="Discuss this claim"
          >
            <MessageCircle size={14} aria-hidden="true" />
            <span>Discuss</span>
          </button>
        </div>
      </footer>
    </article>
  );
}

/* ── Verdict reveal (post-vote) ── */

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
      {/* Banner */}
      <div
        className={[
          'flex items-center justify-between gap-3 rounded-md border-2 border-black px-4 py-2.5',
          isCorrect ? 'bg-highlight text-highlight-foreground' : 'bg-danger text-danger-foreground',
        ].join(' ')}
        role="status"
        aria-live="polite"
      >
        <span className="flex items-center gap-2 text-label font-medium">
          {isCorrect ? (
            <>
              <Trophy size={16} aria-hidden="true" />
              You said <strong className="uppercase">{userGuess.answer}</strong> — correct! +10 pts
            </>
          ) : (
            <>
              <AlertTriangle size={16} aria-hidden="true" />
              You said <strong className="uppercase">{userGuess.answer}</strong> — it was actually{' '}
              <strong className="uppercase">{claim.verdict}</strong>
            </>
          )}
        </span>
      </div>

      {/* Verdict + explanation */}
      <div className="rounded-md border-2 border-black bg-background p-4">
        <div className="mb-2 flex items-center gap-2">
          <span
            className={[
              'inline-flex items-center gap-1 rounded-md border-2 border-black px-2 py-0.5 text-label-small font-bold uppercase tracking-wider',
              claim.verdict === 'real' ? 'bg-card text-foreground' : 'bg-danger text-danger-foreground',
            ].join(' ')}
          >
            {claim.verdict === 'real' ? '✓ Real' : '✗ Fake'}
          </span>
          <span className="text-label-small text-muted-foreground">
            {CATEGORY_META[claim.category].label}
          </span>
        </div>
        <p className="text-body text-foreground/90 leading-relaxed">{claim.explanation}</p>

        {claim.sourceUrl && (
          <a
            href={claim.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1 text-label-small text-foreground underline underline-offset-4 hover:text-accent-foreground"
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
        <div className="h-6 w-24 animate-pulse rounded bg-muted" />
        <div className="h-4 w-12 animate-pulse rounded bg-muted" />
      </div>
      <div className="space-y-3 px-5 py-5">
        <div className="h-5 w-full animate-pulse rounded bg-muted" />
        <div className="h-5 w-5/6 animate-pulse rounded bg-muted" />
        <div className="mt-4 h-12 w-full animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}