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

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Flame, Sparkles, TrendingUp } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { ClaimCard, ClaimCardSkeleton } from '@/components/feed/ClaimCard';
import {
  ClaimDetailPanel,
  ClaimDetailDrawer,
} from '@/components/feed/ClaimDetailPanel';
import { Button } from '@/components/ui/button';
import { AppNav } from '@/components/AppNav';
import {
  claimKeys,
  claimsApi,
  CATEGORY_META,
  type Claim,
  type ClaimVerdict,
  type ClaimCategory,
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
  const { user, status } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedCategory, setSelectedCategory] = useState<ClaimCategory | null>(null);
  const isWelcome = searchParams.get('welcome') === 'true';
  const qc = useQueryClient();
  const reduce = useReducedMotion();

  // Gate auth-required queries so they don't fire after sign-out (the user is
  // already being bounced to /signin by ClaimsRoute, but during the transition
  // we'd otherwise hit /api/claims/me/guesses and get a noisy 401).
  const isAuthed = status === 'authenticated';

  const EASE = [0.32, 0.72, 0, 1] as const;

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
    // Only the signed-in user has guesses. Don't fire on the public landing
    // page or after sign-out.
    enabled: isAuthed,
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
    let filtered = claims;

    // Apply category filter
    if (selectedCategory) {
      filtered = claims.filter((c) => c.category === selectedCategory);
    }

    const unvoted: Claim[] = [];
    const voted: Claim[] = [];
    for (const c of filtered) {
      if (guesses[c.id]) voted.push(c);
      else unvoted.push(c);
    }
    return [...unvoted, ...voted];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claimsQuery.data, guessesQuery.data, selectedCategory]);

  const featuredId = orderedClaims[0] && !guesses[orderedClaims[0].id]
    ? orderedClaims[0].id
    : null;

  const votedCount = Object.keys(guesses).length;
  const totalCount = claims.length;
  const progressPct = totalCount === 0 ? 0 : Math.min(100, Math.round((votedCount / totalCount) * 100));

  /* ── Panel selection (URL-driven) ── */
  const selected = claims.find((c) => c.id === selectedClaimId) ?? null;
  const isPanelOpen = !!selected;

  const openClaim = (id: string) => navigate(`/claims/${id}`);
  const closePanel = () => navigate('/claims', { replace: true });

  // Deep link to a claim that isn't in the list — bounce to the feed.
  useEffect(() => {
    if (selectedClaimId && claimsQuery.isSuccess && !selected) {
      navigate('/claims', { replace: true });
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
      {/* ── Shared App Nav ── */}
      <AppNav showClaims={true} />

      {/* ── Split pane ──
          Desktop: feed column scrolls independently, panel docked right.
          Mobile: single column; the panel becomes a bottom-sheet drawer. */}
      <div className="mx-auto flex w-full max-w-[1600px] min-h-0 flex-1">
        {/* Feed column */}
        <motion.div
          layout
          className={[
            'min-h-0 flex-1 overflow-y-auto px-6 py-8',
            isPanelOpen ? 'lg:w-[55%] lg:max-w-[55%]' : 'mx-auto max-w-3xl',
          ].join(' ')}
        >
          {/* Welcome banner (post-OAuth) */}
          {isWelcome && user && (
            <motion.div
              initial={reduce ? false : { opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.7, ease: EASE }}
              className="mb-6 flex items-start gap-3 rounded-2xl border-2 border-black bg-highlight p-4 text-highlight-foreground shadow-hard-sm"
            >
              <motion.span
                aria-hidden
                animate={{ rotate: [0, 12, -12, 0] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                className="mt-0.5 shrink-0"
              >
                <Sparkles size={20} aria-hidden="true" />
              </motion.span>
              <div>
                <p className="font-semibold">Welcome, {user.displayName.split(' ')[0]}!</p>
                <p className="text-label-small text-foreground/80">
                  Vote on a claim to earn your first 10 points.
                </p>
              </div>
            </motion.div>
          )}

          {/* Page header — the page's loudest moment. Display heading
              underlined with the brand accent, plus a streak chip on the right
              that flips orange the moment the user hits a streak. */}
          <motion.div
            className="mb-5"
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
            }}
          >
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <motion.p
                  variants={{
                    hidden: { opacity: 0, y: 8 },
                    show: { opacity: 1, y: 0 },
                  }}
                  transition={{ duration: 0.5, ease: EASE }}
                  className="flex items-center gap-1.5 text-label-small font-semibold uppercase tracking-wider text-foreground/70"
                >
                  <TrendingUp size={14} aria-hidden="true" />
                  Today's claims
                </motion.p>
                <h1 className="mt-1 inline-block font-display text-display-medium font-semibold leading-[0.95] tracking-display text-foreground">
                  <span className="inline-block overflow-hidden align-baseline">
                    <motion.span
                      className="inline-block"
                      variants={{
                        hidden: { y: '110%', opacity: 0 },
                        show: { y: '0%', opacity: 1 },
                      }}
                      transition={{ duration: 0.8, ease: EASE, delay: 0.1 }}
                    >
                      Real
                    </motion.span>
                  </span>{' '}
                  <span className="inline-block overflow-hidden align-baseline">
                    <motion.span
                      className="inline-block"
                      variants={{
                        hidden: { y: '110%', opacity: 0 },
                        show: { y: '0%', opacity: 1 },
                      }}
                      transition={{ duration: 0.8, ease: EASE, delay: 0.18 }}
                    >
                      or
                    </motion.span>
                  </span>{' '}
                  <span className="relative inline-block overflow-hidden align-baseline">
                    <motion.span
                      className="relative inline-block"
                      variants={{
                        hidden: { y: '110%', opacity: 0 },
                        show: { y: '0%', opacity: 1 },
                      }}
                      transition={{ duration: 0.8, ease: EASE, delay: 0.26 }}
                    >
                      fake?
                    </motion.span>
                    {/* Brand-pink underline — signature accent that draws the
                        eye to the heading without introducing a new colour. */}
                    <motion.span
                      aria-hidden="true"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 0.7, ease: EASE, delay: 0.7 }}
                      className="absolute bottom-0 left-0 h-1.5 w-24 origin-left rounded-sm bg-pink-accent"
                    />
                  </span>
                </h1>
                {claims.length > 0 && (
                  <motion.p
                    variants={{
                      hidden: { opacity: 0, y: 6 },
                      show: { opacity: 1, y: 0 },
                    }}
                    transition={{ duration: 0.5, ease: EASE, delay: 0.4 }}
                    className="mt-3 text-label font-medium text-foreground/80"
                  >
                    <span className="tabular-nums">{votedCount}</span> of{' '}
                    <span className="tabular-nums">{totalCount}</span> voted
                    {progressPct === 100 && totalCount > 0 ? ' · all caught up 🎉' : ' · tap a card to vote'}
                  </motion.p>
                )}
              </div>

              {/* Streak chip */}
              {user && (
                <motion.div
                  variants={{
                    hidden: { opacity: 0, scale: 0.85, y: 8 },
                    show: { opacity: 1, scale: 1, y: 0 },
                  }}
                  transition={{ duration: 0.5, ease: EASE, delay: 0.3 }}
                >
                  <StreakChip guesses={guesses} claims={claims} />
                </motion.div>
              )}
            </div>

            {/* Progress rail - color intensity increases with votes */}
            {claims.length > 0 && (
              <motion.div
                initial={{ opacity: 0, scaleX: 0 }}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={{ duration: 0.7, ease: EASE, delay: 0.5 }}
                style={{ transformOrigin: 'left center' }}
                className="mt-5 h-4 w-full overflow-hidden rounded-md border-2 border-black bg-muted"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progressPct}
                aria-label={`${votedCount} of ${totalCount} claims voted`}
              >
                <motion.div
                  className={[
                    'h-full transition-colors duration-500',
                    progressPct === 100 ? 'bg-real' : progressPct >= 75 ? 'bg-accent' : 'bg-orange',
                  ].join(' ')}
                  initial={false}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ type: 'spring', damping: 22, stiffness: 180 }}
                />
              </motion.div>
            )}

            {/* Category filter bar */}
            <motion.div
              className="mt-5 flex flex-wrap gap-2"
              variants={{
                hidden: {},
                show: { transition: { staggerChildren: 0.04, delayChildren: 0.55 } },
              }}
            >
              <motion.button
                type="button"
                onClick={() => setSelectedCategory(null)}
                variants={{
                  hidden: { opacity: 0, y: 6 },
                  show: { opacity: 1, y: 0 },
                }}
                transition={{ duration: 0.4, ease: EASE }}
                whileTap={{ scale: 0.95 }}
                className={`rounded-lg border-2 border-black px-3 py-1.5 text-label-small font-medium transition-all hover-lift ${
                  selectedCategory === null
                    ? 'bg-black text-white shadow-hard-sm'
                    : 'bg-card text-foreground shadow-hard-sm'
                }`}
              >
                All
              </motion.button>
              {Object.entries(CATEGORY_META).map(([key, meta]) => {
                const cat = key as ClaimCategory;
                const isActive = selectedCategory === cat;
                return (
                  <motion.button
                    key={key}
                    type="button"
                    onClick={() => setSelectedCategory(isActive ? null : cat)}
                    variants={{
                      hidden: { opacity: 0, y: 6 },
                      show: { opacity: 1, y: 0 },
                    }}
                    transition={{ duration: 0.4, ease: EASE }}
                    whileTap={{ scale: 0.95 }}
                    className={`rounded-lg border-2 border-black px-3 py-1.5 text-label-small font-medium transition-all hover-lift ${meta.bg} ${meta.ink} ${
                      isActive ? 'ring-2 ring-black ring-offset-2' : 'shadow-hard-sm'
                    }`}
                  >
                    {meta.icon} {meta.label}
                  </motion.button>
                );
              })}
            </motion.div>
          </motion.div>

          {/* Error state */}
          {error && (
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, ease: EASE }}
              className="mb-6 rounded-lg border-2 border-black bg-danger p-4 text-danger-foreground"
            >
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
            </motion.div>
          )}

          {/* Loading state */}
          {isInitialLoading && (
            <motion.div
              className="space-y-5"
              initial="hidden"
              animate="show"
              variants={{
                hidden: {},
                show: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
              }}
            >
              {Array.from({ length: 3 }).map((_, i) => (
                <motion.div
                  key={i}
                  variants={{
                    hidden: { opacity: 0, y: 12 },
                    show: { opacity: 1, y: 0 },
                  }}
                  transition={{ duration: 0.5, ease: EASE }}
                >
                  <ClaimCardSkeleton />
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Empty state */}
          {!isInitialLoading && !error && claims.length === 0 && (
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.7, ease: EASE }}
              className="rounded-lg border-2 border-black bg-card p-10 text-center shadow-hard"
            >
              <p className="font-display text-heading-2 font-semibold">No claims yet</p>
              <p className="mt-2 text-body text-foreground/70">
                The team is curating today's batch. Check back in a few minutes.
              </p>
            </motion.div>
          )}

          {/* Feed */}
          {!isInitialLoading && claims.length > 0 && (
            <motion.div
              className="space-y-5"
              initial="hidden"
              animate="show"
              variants={{
                hidden: {},
                show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
              }}
            >
              <AnimatePresence mode="popLayout">
                {orderedClaims.map((claim) => (
                  <motion.div
                    key={claim.id}
                    layout
                    variants={{
                      hidden: { opacity: 0, y: 20, filter: 'blur(8px)' },
                      show: { opacity: 1, y: 0, filter: 'blur(0px)' },
                    }}
                    transition={{ duration: 0.7, ease: EASE }}
                  >
                    <ClaimCard
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
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
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
        </motion.div>

        {/* ── Desktop Detail Panel (docked right) ── */}
        <AnimatePresence>
          {isPanelOpen && (
            <motion.div
              layout
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: '45%', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="hidden lg:block min-h-0 border-l-2 border-black"
            >
              <div className="h-full overflow-hidden">
                {panelContent}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Mobile Claim Detail Drawer (hidden on desktop) ── */}
      <div className="lg:hidden">
        <ClaimDetailDrawer open={isPanelOpen} onClose={closePanel} fullScreen>
          {panelContent}
        </ClaimDetailDrawer>
      </div>
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
    <motion.span
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
      whileHover={{ scale: 1.04, rotate: -2 }}
      className="inline-flex cursor-default items-center gap-1.5 rounded-lg border-2 border-black bg-orange px-2.5 py-1 text-label-small font-bold uppercase tracking-wider text-foreground shadow-hard-sm"
      aria-label={`On a ${streak}-claim streak`}
    >
      <motion.span
        aria-hidden
        animate={{ rotate: [0, -8, 8, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Flame size={14} strokeWidth={2.5} aria-hidden="true" />
      </motion.span>
      <span>{streak} streak</span>
    </motion.span>
  );
}
