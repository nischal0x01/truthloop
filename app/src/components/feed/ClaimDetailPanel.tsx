/**
 * ClaimDetailPanel — the right-hand claim detail + discussion pane.
 *
 * Rendered docked beside the feed on desktop (≥1024px) and as a bottom-sheet
 * drawer on mobile. The parent (Feed) owns which claim is selected and the
 * vote mutation; this component owns the comment queries and mutations.
 *
 * Layout is a three-row grid: fixed header, scrollable body, sticky composer.
 * Only the body scrolls, so the composer is always reachable in a long thread.
 *
 * Spoiler rule: the verdict + explanation are hidden until the user has voted,
 * and so are comments — otherwise the top comment spoils the answer. An
 * unvoted claim shows the vote buttons and a "vote to unlock" notice instead.
 */

import { useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ExternalLink,
  Loader2,
  Lock,
  MessagesSquare,
  X,
  Check,
  AlertTriangle,
  Trophy,
} from 'lucide-react';
import { CategoryPill } from './CategoryPill';
import { VoteButtons } from './VoteButtons';
import { CommentThread } from './CommentThread';
import { CommentComposer } from './CommentComposer';
import {
  buildTree,
  commentKeys,
  commentsApi,
  countComments,
  type Comment,
  type CommentVoteValue,
} from '@/lib/comments';
import {
  CATEGORY_META,
  timeAgo,
  type Claim,
  type ClaimVerdict,
  type UserGuess,
} from '@/lib/claims';

interface ClaimDetailPanelProps {
  claim: Claim;
  userGuess?: UserGuess;
  isVoting?: boolean;
  onVote: (answer: ClaimVerdict) => void;
  onClose: () => void;
  /** False for signed-out visitors — hides composers and vote arrows. */
  canInteract: boolean;
}

export function ClaimDetailPanel({
  claim,
  userGuess,
  isVoting,
  onVote,
  onClose,
  canInteract,
}: ClaimDetailPanelProps) {
  const qc = useQueryClient();
  const hasVoted = !!userGuess;
  const key = commentKeys.forClaim(claim.id);

  /* ── Comments ── */
  // Not fetched until the user has voted — saves a request and enforces the
  // spoiler rule at the network layer, not just visually.
  const commentsQuery = useQuery({
    queryKey: key,
    queryFn: () => commentsApi.list(claim.id),
    enabled: hasVoted,
  });

  const tree = useMemo(
    () => buildTree(commentsQuery.data?.comments ?? [], commentsQuery.data?.maxDepth ?? 5),
    [commentsQuery.data]
  );
  const total = useMemo(() => countComments(tree), [tree]);

  /* ── Post a comment / reply ── */
  const createMutation = useMutation({
    mutationFn: (input: { parentCommentId?: string | null; body: string }) =>
      commentsApi.create({ claimId: claim.id, ...input }),
    onSuccess: ({ comment }) => {
      // Append to cache directly — avoids a refetch and keeps the new comment
      // visible even though the server sorts by score (a fresh 0-score comment
      // would otherwise jump to the bottom on refetch).
      qc.setQueryData<{ comments: Comment[]; maxDepth: number }>(key, (cur) =>
        cur
          ? { ...cur, comments: [...cur.comments, comment] }
          : { comments: [comment], maxDepth: 5 }
      );
    },
  });

  /* ── Vote on a comment ── */
  const voteMutation = useMutation({
    mutationFn: ({ commentId, vote }: { commentId: string; vote: CommentVoteValue }) =>
      commentsApi.vote(commentId, vote),

    onMutate: async ({ commentId, vote }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<{ comments: Comment[]; maxDepth: number }>(key);

      // Optimistic: shift the tally by the delta between old and new vote.
      qc.setQueryData<{ comments: Comment[]; maxDepth: number }>(key, (cur) => {
        if (!cur) return cur;
        return {
          ...cur,
          comments: cur.comments.map((c) => {
            if (c.id !== commentId) return c;
            const wasUp = c.myVote === 1 ? 1 : 0;
            const wasDown = c.myVote === -1 ? 1 : 0;
            const isUp = vote === 1 ? 1 : 0;
            const isDown = vote === -1 ? 1 : 0;
            return {
              ...c,
              myVote: vote,
              upvotes: c.upvotes - wasUp + isUp,
              downvotes: c.downvotes - wasDown + isDown,
            };
          }),
        };
      });

      return { prev };
    },

    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
    },

    onSuccess: ({ comment }) => {
      // Reconcile with the server's recomputed tally.
      qc.setQueryData<{ comments: Comment[]; maxDepth: number }>(key, (cur) =>
        cur
          ? {
              ...cur,
              comments: cur.comments.map((c) =>
                c.id === comment.id
                  ? { ...c, upvotes: comment.upvotes, downvotes: comment.downvotes, myVote: comment.myVote }
                  : c
              ),
            }
          : cur
      );
    },
  });

  return (
    <section
      className="grid h-full grid-rows-[auto_1fr_auto] overflow-hidden bg-background"
      aria-label="Claim detail and discussion"
    >
      {/* ── Header ── */}
      <header className="border-b-2 border-black bg-card px-5 py-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <CategoryPill category={claim.category} />
            <span className="text-label-small text-muted-foreground">
              {timeAgo(claim.publishedAt ?? claim.createdAt)}
            </span>
            <span className="text-label-small text-muted-foreground">
              · {claim.voteCount.toLocaleString()} votes
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close detail panel"
            className="grid size-8 shrink-0 place-items-center rounded-lg border-2 border-black bg-background transition-transform hover:-translate-y-px"
          >
            <X size={15} strokeWidth={2.5} aria-hidden="true" />
          </button>
        </div>

        <h2
          className="mt-3 font-display text-heading-3 font-medium leading-snug"
          style={{ overflowWrap: 'anywhere' }}
        >
          &ldquo;{claim.text}&rdquo;
        </h2>
      </header>

      {/* ── Scrollable body ── */}
      <div className="min-h-0 overflow-y-auto px-5 py-4">
        {/* Vote / verdict */}
        {!hasVoted ? (
          <div className="rounded-lg border-2 border-black bg-card p-4 shadow-hard-sm">
            <p className="mb-3 text-label-small uppercase tracking-wider text-muted-foreground">
              Your call
            </p>
            <VoteButtons isVoting={isVoting} onVote={onVote} />
            <p className="mt-3 flex items-center gap-1.5 text-label-small text-muted-foreground">
              <Lock size={12} aria-hidden="true" />
              Vote to reveal the verdict and unlock the discussion.
            </p>
          </div>
        ) : (
          <VerdictBlock claim={claim} userGuess={userGuess} />
        )}

        {/* Discussion */}
        {hasVoted && (
          <div className="mt-6">
            <h3 className="mb-3 flex items-center gap-2 text-label font-semibold">
              <MessagesSquare size={15} aria-hidden="true" />
              Discussion
              {total > 0 && <span className="text-muted-foreground">({total})</span>}
            </h3>

            {commentsQuery.isLoading && (
              <div className="flex items-center gap-2 py-6 text-label-small text-muted-foreground">
                <Loader2 size={15} className="animate-spin" aria-hidden="true" />
                Loading discussion…
              </div>
            )}

            {commentsQuery.isError && (
              <div className="rounded-lg border-2 border-black bg-danger p-3 text-danger-foreground">
                <p className="text-label-small font-medium">Couldn't load the discussion.</p>
                <button
                  type="button"
                  onClick={() => commentsQuery.refetch()}
                  className="mt-2 rounded border-2 border-black bg-background px-2 py-1 text-label-small text-foreground"
                >
                  Try again
                </button>
              </div>
            )}

            {commentsQuery.isSuccess && total === 0 && (
              <p className="rounded-lg border-2 border-dashed border-black/30 px-4 py-6 text-center text-label-small text-muted-foreground">
                No comments yet — start the thread.
              </p>
            )}

            {total > 0 && (
              <CommentThread
                nodes={tree}
                canInteract={canInteract}
                onVote={(commentId, vote) => voteMutation.mutate({ commentId, vote })}
                onReply={async (parentCommentId, body) => {
                  await createMutation.mutateAsync({ parentCommentId, body });
                }}
              />
            )}
          </div>
        )}
      </div>

      {/* ── Sticky composer ── */}
      <footer className="border-t-2 border-black bg-card px-5 py-3">
        {!canInteract ? (
          <p className="text-center text-label-small text-muted-foreground">
            Sign in to join the discussion.
          </p>
        ) : !hasVoted ? (
          <p className="flex items-center justify-center gap-1.5 text-label-small text-muted-foreground">
            <Lock size={12} aria-hidden="true" />
            Vote first to comment.
          </p>
        ) : (
          <CommentComposer
            onSubmit={async (body) => {
              await createMutation.mutateAsync({ parentCommentId: null, body });
            }}
          />
        )}
      </footer>
    </section>
  );
}

/* ── Verdict reveal (post-vote) ── */

function VerdictBlock({ claim, userGuess }: { claim: Claim; userGuess?: UserGuess }) {
  const correct = userGuess?.correct;
  return (
    <div className="space-y-3">
      <div
        className={[
          'flex items-center gap-2 rounded-lg border-2 border-black px-4 py-2.5 text-label font-medium',
          correct ? 'bg-highlight text-highlight-foreground' : 'bg-danger text-danger-foreground',
        ].join(' ')}
        role="status"
      >
        {correct ? (
          <>
            <Trophy size={15} aria-hidden="true" />
            You said <strong className="uppercase">{userGuess?.answer}</strong> — correct! +10 pts
          </>
        ) : (
          <>
            <AlertTriangle size={15} aria-hidden="true" />
            You said <strong className="uppercase">{userGuess?.answer}</strong> — it was{' '}
            <strong className="uppercase">{claim.verdict}</strong>
          </>
        )}
      </div>

      <div className="rounded-lg border-2 border-black bg-card p-4">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span
            className={[
              'inline-flex items-center gap-1 rounded-md border-2 border-black px-2 py-0.5 text-label-small font-bold uppercase tracking-wider',
              claim.verdict === 'real'
                ? 'bg-background text-foreground'
                : 'bg-danger text-danger-foreground',
            ].join(' ')}
          >
            {claim.verdict === 'real' ? (
              <>
                <Check size={11} aria-hidden="true" /> Real
              </>
            ) : (
              <>
                <X size={11} aria-hidden="true" /> Fake
              </>
            )}
          </span>
          <span className="text-label-small text-muted-foreground">
            {CATEGORY_META[claim.category].label}
          </span>
        </div>

        <p className="text-label-small leading-relaxed text-foreground/90">{claim.explanation}</p>

        {claim.sourceUrl && (
          <a
            href={claim.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1 text-label-small underline underline-offset-4 hover:text-accent-foreground"
          >
            <ExternalLink size={12} aria-hidden="true" />
            Source
          </a>
        )}
      </div>
    </div>
  );
}

/* ── Empty state: shown in the docked pane when nothing is selected ── */

export function ClaimDetailEmpty() {
  return (
    <div className="grid h-full place-items-center px-8 text-center">
      <div>
        <div className="mx-auto grid size-12 place-items-center rounded-lg border-2 border-black bg-accent">
          <MessagesSquare size={22} strokeWidth={2} aria-hidden="true" />
        </div>
        <p className="mt-4 text-label font-semibold">Pick a claim</p>
        <p className="mt-1 text-label-small text-muted-foreground">
          Select any claim to read the verdict and join the discussion.
        </p>
      </div>
    </div>
  );
}

/* ── Mobile drawer wrapper ── */

export function ClaimDetailDrawer({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/45 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            className="fixed inset-x-0 bottom-0 z-50 h-[88vh] overflow-hidden rounded-t-2xl border-t-2 border-black lg:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Claim discussion"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
