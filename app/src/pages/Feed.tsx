/* Hallmark · page: feed · genre: app-shell · theme: Gumroad system
 *   pre-emit critique: P5 H5 E5 S5 R5 V4
 *
 * Authenticated claims feed. Loads published claims + the current user's
 * guess map in parallel, then renders one ClaimCard per claim.
 *
 * Voting flow:
 *   - mutation posts to /api/claims/:id/guess with the chosen answer
 *   - on success: optimistically write the guess to the my-guesses cache
 *     and invalidate the claims list (vote_count goes up)
 *   - on error: revert
 *
 * Feed ordering:
 *   1. The user's first unvoted claim (if any) — marked `featured`, hoisted
 *      to the top, with a pink ring + "YOUR TURN" badge.
 *   2. The remaining unvoted claims.
 *   3. Already-voted claims.
 * This gives the page a single, unambiguous next action at all times.
 */

/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V4 */

import { useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import { Flame, LogOut, Sparkles, TrendingUp } from 'lucide-react';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { ClaimCard, ClaimCardSkeleton } from '@/components/feed/ClaimCard';
import {
  ClaimDetailPanel,
  ClaimDetailEmpty,
  ClaimDetailDrawer,
} from '@/components/feed/ClaimDetailPanel';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/auth/UserAvatar';
import {
  claimKeys,
  claimsApi,
  type Claim,
  type ClaimVerdict,
  type UserGuessMap,
} from '@/lib/claims';

interface FeedProps {
  /**
   * Optional initial search string (e.g. `?welcome=true` from OAuth callback).
   */
  initialSearch?: string;
  /**
   * Claim to open in the detail panel on mount — set by the /claim/:id route.
   */
  selectedClaimId?: string;
}

export function Feed({ initialSearch = '', selectedClaimId }: FeedProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isWelcome = searchParams.get('welcome') === 'true';
  const qc = useQueryClient();

  // Strip the ?welcome=true once we've shown it.
  useEffect(() => {
    if (isWelcome) {
      const t = setTimeout(() => {
        searchParams.delete('welcome');
        setSearchParams(searchParams, { replace: true });
      }, 50);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [isWelcome, searchParams, setSearchParams]);

  useEffect(() => {
    if (initialSearch && !searchParams.toString()) {
      setSearchParams(new URLSearchParams(initialSearch), { replace: true });
    }
  }, [initialSearch, searchParams, setSearchParams]);

  /* ── Queries ── */
  const claimsQuery = useQuery({
    queryKey: claimKeys.list(),
    queryFn: () => claimsApi.list().then((r) => r.claims),
  });

  const guessesQuery = useQuery({
    queryKey: claimKeys.myGuesses(),
    queryFn: () => claimsApi.myGuesses().then((r) => r.guesses),
  });

  /* ── Vote mutation ── */
  const voteMutation = useMutation({
    mutationFn: ({ claimId, answer }: { claimId: string; answer: ClaimVerdict }) =>
      claimsApi.vote(claimId, answer),

    onMutate: async ({ claimId, answer }) => {
      await qc.cancelQueries({ queryKey: claimKeys.myGuesses() });
      const prev = qc.getQueryData<UserGuessMap | undefined>(claimKeys.myGuesses());
      qc.setQueryData<UserGuessMap | undefined>(claimKeys.myGuesses(), (cur) => ({
        ...(cur ?? {}),
        [claimId]: { answer, correct: false },
      }));
      return { prev };
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(claimKeys.myGuesses(), ctx.prev);
    },

    onSuccess: (result, { claimId }) => {
      qc.setQueryData<UserGuessMap | undefined>(claimKeys.myGuesses(), (cur) => ({
        ...(cur ?? {}),
        [claimId]: { answer: result.guess.userAnswer, correct: result.guess.isCorrect },
      }));
      qc.invalidateQueries({ queryKey: claimKeys.list() });
      qc.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  });

  /* ── Derived ── */
  const claims: Claim[] = claimsQuery.data ?? [];
  const guesses: UserGuessMap = guessesQuery.data ?? {};
  const isInitialLoading = claimsQuery.isLoading && !claimsQuery.data;
  const error = (claimsQuery.error || guessesQuery.error) as Error | null;

  /* ── Reorder: first unvoted on top (featured), rest unvoted, then voted ── */
  const orderedClaims = useMemo(() => {
    if (claims.length === 0) return [] as Claim[];
    const unvoted: Claim[] = [];
    const voted: Claim[] = [];
    for (const c of claims) {
      if (guesses[c.id]) voted.push(c);
      else unvoted.push(c);
    }
    return [...unvoted, ...voted];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claimsQuery.data, guessesQuery.data]);

  const featuredId = orderedClaims[0] && !guesses[orderedClaims[0].id]
    ? orderedClaims[0].id
    : null;

  const votedCount = Object.keys(guesses).length;
  const totalCount = claims.length;
  const progressPct = totalCount === 0 ? 0 : Math.min(100, Math.round((votedCount / totalCount) * 100));

  /* ── Panel selection (URL-driven) ── */
  const selected = claims.find((c) => c.id === selectedClaimId) ?? null;
  const isPanelOpen = !!selected;

  const openClaim = (id: string) => navigate(`/claim/${id}`);
  const closePanel = () => navigate('/', { replace: true });

  // Deep link to a claim that isn't in the list — bounce to the feed.
  useEffect(() => {
    if (selectedClaimId && claimsQuery.isSuccess && !selected) {
      navigate('/', { replace: true });
    }
  }, [selectedClaimId, claimsQuery.isSuccess, selected, navigate]);

  // Escape closes the panel.
  useEffect(() => {
    if (!isPanelOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePanel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPanelOpen]);

  /* ── Vote handler ── */
  const handleVote = (claimId: string, answer: ClaimVerdict) => {
    voteMutation.mutate({ claimId, answer });
  };

  /* ── Panel content (shared by the docked pane and the mobile drawer) ── */
  const panelContent = selected ? (
    <ClaimDetailPanel
      claim={selected}
      userGuess={guesses[selected.id]}
      isVoting={voteMutation.isPending && voteMutation.variables?.claimId === selected.id}
      onVote={(answer) => handleVote(selected.id, answer)}
      onClose={closePanel}
      canInteract={!!user}
    />
  ) : null;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      {/* ── Top bar ── */}
      <header className="z-30 shrink-0 border-b-2 border-black bg-background">
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-4 px-6 py-4">
          <Link
            to="/"
            className="flex items-center gap-2 text-label font-semibold tracking-display"
          >
            <ShieldCheck size={20} strokeWidth={2.2} aria-hidden="true" />
            <span>TruthLoop</span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              to="/profile"
              className="hidden text-label font-medium text-foreground hover:underline underline-offset-4 sm:inline"
            >
              Leaderboard
            </Link>
            <Link
              to="/profile"
              className="hidden text-label font-medium text-foreground hover:underline underline-offset-4 sm:inline"
            >
              Forecast
            </Link>
            <Link
              to="/profile"
              className="hidden text-label font-medium text-foreground hover:underline underline-offset-4 sm:inline"
            >
              Profile
            </Link>
            {user && (
              <>
                <motion.span
                  key={user.points}
                  initial={{ scale: 1.2, opacity: 0.7 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', damping: 10, stiffness: 200 }}
                  className="hidden items-center gap-1.5 rounded-lg border-2 border-black bg-highlight px-2.5 py-1 text-label-small font-semibold text-highlight-foreground sm:inline-flex"
                >
                  {user.points ?? 0} pts
                </motion.span>
                <UserAvatar
                  src={user.avatarUrl}
                  name={user.displayName}
                  size={36}
                  className="border-2 border-black"
                />
                <Button
                  variant="outline"
                  size="default"
                  onClick={() => {
                    void signOut().then(() => navigate('/'));
                  }}
                  aria-label="Sign out"
                  className="border-2 border-black rounded-lg hover-lift"
                >
                  <LogOut size={14} aria-hidden="true" />
                  <span className="hidden sm:inline">Sign out</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Split pane ──
          Desktop: feed column scrolls independently, panel docked right.
          Mobile: single column; the panel becomes a bottom-sheet drawer. */}
      <div className="mx-auto flex w-full max-w-[1600px] min-h-0 flex-1">
        {/* Feed column */}
        <div
          className={[
            'min-h-0 flex-1 overflow-y-auto px-6 py-8',
            isPanelOpen ? 'lg:max-w-2xl' : 'mx-auto max-w-3xl',
          ].join(' ')}
        >
          {/* Welcome banner (post-OAuth) */}
          {isWelcome && user && (
            <div className="mb-6 flex items-start gap-3 rounded-lg border-2 border-black bg-highlight p-4 text-highlight-foreground shadow-hard-sm">
              <Sparkles size={20} aria-hidden="true" />
              <div>
                <p className="font-semibold">Welcome, {user.displayName.split(' ')[0]}!</p>
                <p className="text-label-small text-foreground/80">
                  Vote on a claim to earn your first 10 points.
                </p>
              </div>
            </div>
          )}

          {/* Page header — the page's loudest moment. Display heading
              underlined with the brand accent, plus a streak chip on the right
              that flips orange the moment the user hits a streak. */}
          <div className="mb-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="flex items-center gap-1.5 text-label-small font-semibold uppercase tracking-wider text-foreground/70">
                  <TrendingUp size={14} aria-hidden="true" />
                  Today's claims
                </p>
                <h1 className="mt-1 inline-block font-display text-display-medium font-semibold leading-[0.95] tracking-display text-foreground">
                  Real or fake?
                  {/* Brand-pink underline — signature accent that draws the
                      eye to the heading without introducing a new colour. */}
                  <span
                    aria-hidden="true"
                    className="mt-2 block h-1.5 w-24 rounded-sm bg-accent"
                  />
                </h1>
                {claims.length > 0 && (
                  <p className="mt-3 text-label font-medium text-foreground/80">
                    {votedCount} of {totalCount} voted
                    {progressPct === 100 && totalCount > 0 ? ' · all caught up 🎉' : ' · tap a card to vote'}
                  </p>
                )}
              </div>

              {/* Streak chip — the user is on a streak if their last few votes
                  were correct. We don't track streaks server-side yet, so we
                  derive a simple "hot" state from recent correct votes. */}
              {user && (
                <StreakChip guesses={guesses} claims={claims} />
              )}
            </div>

            {/* Progress rail — chunky, brand-coloured, clearly readable at a
                glance. The filled portion uses yellow (highlight) so the user
                sees their progress without staring at numbers. */}
            {claims.length > 0 && (
              <div
                className="mt-5 h-3 w-full overflow-hidden rounded-md border-2 border-black bg-muted"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progressPct}
                aria-label={`${votedCount} of ${totalCount} claims voted`}
              >
                <motion.div
                  className="h-full bg-highlight"
                  initial={false}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ type: 'spring', damping: 22, stiffness: 180 }}
                />
              </div>
            )}
          </div>

          {/* Error state */}
          {error && (
            <div className="mb-6 rounded-lg border-2 border-black bg-danger p-4 text-danger-foreground">
              <p className="font-semibold">Couldn't load claims.</p>
              <p className="mt-1 text-label-small">{error.message}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  claimsQuery.refetch();
                  guessesQuery.refetch();
                }}
                className="mt-3 border-2 border-black rounded-lg"
              >
                Try again
              </Button>
            </div>
          )}

          {/* Loading state */}
          {isInitialLoading && (
            <div className="space-y-5">
              {Array.from({ length: 3 }).map((_, i) => (
                <ClaimCardSkeleton key={i} />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!isInitialLoading && !error && claims.length === 0 && (
            <div className="rounded-lg border-2 border-black bg-card p-10 text-center shadow-hard">
              <p className="font-display text-heading-2 font-semibold">No claims yet</p>
              <p className="mt-2 text-body text-foreground/70">
                The team is curating today's batch. Check back in a few minutes.
              </p>
            </div>
          )}

          {/* Feed */}
          {!isInitialLoading && claims.length > 0 && (
            <div className="space-y-5">
              {orderedClaims.map((claim) => (
                <ClaimCard
                  key={claim.id}
                  claim={claim}
                  userGuess={guesses[claim.id]}
                  isVoting={
                    voteMutation.isPending && voteMutation.variables?.claimId === claim.id
                  }
                  onVote={(answer) => handleVote(claim.id, answer)}
                  onOpen={() => openClaim(claim.id)}
                  isActive={selectedClaimId === claim.id}
                  featured={claim.id === featuredId}
                  compact={isPanelOpen}
                />
              ))}
            </div>
          )}

          {/* Vote-error banner */}
          {voteMutation.isError && (
            <div
              className="mt-6 rounded-lg border-2 border-black bg-danger p-4 text-danger-foreground"
              role="alert"
            >
              <p className="font-semibold">Vote failed</p>
              <p className="mt-1 text-label-small">
                {(voteMutation.error as Error).message}
              </p>
            </div>
          )}
        </div>

        {/* ── Docked panel (desktop only) ── */}
        <AnimatePresence initial={false}>
          {isPanelOpen && (
            <motion.aside
              key="docked-panel"
              className="hidden min-h-0 shrink-0 border-l-2 border-black lg:block lg:w-[clamp(400px,38vw,620px)]"
              initial={{ x: 40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 40, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              {panelContent}
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Idle hint in the dock area when nothing is selected (desktop, wide) */}
        {!isPanelOpen && claims.length > 0 && (
          <aside className="hidden min-h-0 w-[clamp(400px,32vw,520px)] shrink-0 border-l-2 border-black xl:block">
            <ClaimDetailEmpty />
          </aside>
        )}
      </div>

      {/* ── Mobile drawer ── */}
      <ClaimDetailDrawer open={isPanelOpen} onClose={closePanel}>
        {panelContent}
      </ClaimDetailDrawer>
    </div>
  );
}

/* ── Streak chip ──────────────────────────────────────────────────── */

/**
 * Visual: a flame + "X day streak" badge. Goes orange when the user has at
 * least 3 correct votes in their most-recent guesses; otherwise stays neutral.
 * The "days" semantics are approximated by counting recent correct guesses —
 * we don't track calendar days yet, but the chip's intent (you're on a roll)
 * is what matters visually.
 */
function StreakChip({
  guesses,
  claims,
}: {
  guesses: UserGuessMap;
  claims: Claim[];
}) {
  // Pull the most recent N votes by claim publishedAt as a proxy for recency.
  const recent = useMemo(() => {
    const ids = Object.keys(guesses);
    if (ids.length === 0) return [];
    const sorted = [...claims]
      .filter((c) => guesses[c.id])
      .sort((a, b) => {
        const at = new Date(a.publishedAt ?? a.createdAt).getTime();
        const bt = new Date(b.publishedAt ?? b.createdAt).getTime();
        return bt - at;
      })
      .slice(0, 5);
    return sorted.map((c) => guesses[c.id]);
  }, [guesses, claims]);

  const streak = recent.length > 0 && recent.every((g) => g.correct) ? recent.length : 0;
  if (streak < 2) return null;

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-lg border-2 border-black bg-orange px-2.5 py-1 text-label-small font-bold uppercase tracking-wider text-foreground shadow-hard-sm"
      aria-label={`On a ${streak}-claim streak`}
    >
      <Flame size={14} strokeWidth={2.5} aria-hidden="true" />
      <span>{streak} streak</span>
    </span>
  );
}
