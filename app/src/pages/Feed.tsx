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
import { ArrowRight, Calendar, Flame, Sparkles, TrendingUp, Wand2, X } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { ClaimCard, ClaimCardSkeleton } from '@/components/feed/ClaimCard';
import {
  ClaimDetailPanel,
  ClaimDetailDrawer,
} from '@/components/feed/ClaimDetailPanel';
import { BadgeUnlockedModal } from '@/components/feed/BadgeUnlockedModal';
import { Button } from '@/components/ui/button';
import { AppNav } from '@/components/AppNav';
import {
  applyVoteToCache,
  claimKeys,
  getClaimsQuery,
  getMyGuessesQuery,
  voteClaimMutation,
  CATEGORY_META,
  type Claim,
  type ClaimVerdict,
  type ClaimCategory,
  type DateRange,
  type UserGuessMap,
} from '@/actions/claims';
import { ApiError } from '@/lib/api';
import { type ProfileBadge } from '@/actions/profile';
import { runHarvestMutation, type ClaimHarvestSummary } from '@/actions/admin';

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
  const [unlockedBadges, setUnlockedBadges] = useState<ProfileBadge[]>([]);
  // Latest result from the admin harvest trigger. null when no run yet,
  // or after the user dismisses. Numbered fields so the banner can show
  // the full pipeline ("X search hits → Y AI items → Z inserted").
  const [harvestResult, setHarvestResult] = useState<ClaimHarvestSummary | null>(null);

  /* ── Date-range filter ──
     Preset is the chip the user clicked; customRange is the user's
     manual date pick when "Custom" is active. Both feed into `dateRange`
     which the query uses as its key suffix + ?from/?to query params. */
  type DatePreset = 'all' | 'today' | 'yesterday' | 'last3' | 'last7' | 'custom';
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [customRange, setCustomRange] = useState<{ from: string; to: string }>({
    from: '',
    to: '',
  });

  const dateRange: DateRange | undefined = useMemo(() => {
    if (datePreset === 'all') return undefined;
    if (datePreset === 'custom') {
      return customRange.from && customRange.to ? customRange : undefined;
    }
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    const shift = (n: number) => {
      const d = new Date(today);
      d.setUTCDate(d.getUTCDate() + n);
      return d;
    };
    switch (datePreset) {
      case 'today':
        return { from: iso(today), to: iso(shift(1)) };
      case 'yesterday':
        return { from: iso(shift(-1)), to: iso(today) };
      case 'last3':
        return { from: iso(shift(-2)), to: iso(shift(1)) };
      case 'last7':
        return { from: iso(shift(-6)), to: iso(shift(1)) };
    }
    return undefined;
  }, [datePreset, customRange]);
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

  /* ── Queries (factories from actions/claims.ts) ── */
  const claimsQuery = useQuery(getClaimsQuery(dateRange));

  const guessesQuery = useQuery({
    ...getMyGuessesQuery(),
    // Only the signed-in user has guesses. Don't fire on the public landing
    // page or after sign-out.
    enabled: isAuthed,
  });

  /* ── Vote mutation (factory from actions/claims.ts) ── */
  const voteMutation = useMutation({
    ...voteClaimMutation(),

    onMutate: async ({ claimId, answer }) => {
      await qc.cancelQueries({ queryKey: claimKeys.myGuesses() });
      const prev = qc.getQueryData<UserGuessMap | undefined>(claimKeys.myGuesses());
      qc.setQueryData<UserGuessMap | undefined>(claimKeys.myGuesses(), (cur) => ({
        ...(cur ?? {}),
        [claimId]: { answer, correct: false },
      }));
      return { prev };
    },

    onError: (err, _vars, ctx) => {
      // 409 "already voted" — the cache said we hadn't voted (e.g. a fresh
      // demo seed the server knows about), but the server says we have.
      // Reverting to `prev` would just bounce the card back to vote buttons,
      // leaving the user stuck. Refetch instead so the card snaps to the
      // authoritative state (locked + real verdict).
      if (err instanceof ApiError && err.status === 409) {
        qc.invalidateQueries({ queryKey: claimKeys.myGuesses() });
        return;
      }
      if (ctx?.prev) qc.setQueryData(claimKeys.myGuesses(), ctx.prev);
    },

    onSuccess: (result, { claimId }) => {
      applyVoteToCache(result, claimId);
      // Fire the badge ceremony if the server returned newly-earned badges.
      if (result.newlyEarnedBadges && result.newlyEarnedBadges.length > 0) {
        setUnlockedBadges(result.newlyEarnedBadges);
      }
    },
  });

  /* ── Admin harvest trigger (gated by `user?.isAdmin` in the UI) ──
      Server enforces it too — see `requireAdmin` in admin.ts. */
  const harvestMutation = useMutation({
    ...runHarvestMutation(),
    onSuccess: (summary) => setHarvestResult(summary),
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

          {/* Harvest result banner (only shown after an admin clicks
              Harvest). Tinted orange on success (any insert) and neutral
              gray on a no-op run so the operator can tell them apart. */}
          <AnimatePresence>
            {harvestResult && !harvestMutation.isPending && (
              <motion.div
                key="harvest-result"
                initial={reduce ? false : { opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98 }}
                transition={{ duration: 0.4, ease: EASE }}
                className={[
                  'mb-5 flex items-start gap-3 rounded-2xl border-2 border-black p-4 shadow-hard-sm',
                  harvestResult.inserted > 0
                    ? 'bg-orange text-foreground'
                    : 'bg-muted text-foreground',
                ].join(' ')}
                role="status"
                aria-live="polite"
              >
                <span aria-hidden className="mt-0.5 shrink-0">
                  <Wand2 size={20} aria-hidden="true" />
                </span>
                <div className="flex-1">
                  <p className="font-semibold">
                    {harvestResult.inserted > 0
                      ? `Pulled in ${harvestResult.inserted} fresh claim${harvestResult.inserted === 1 ? '' : 's'}`
                      : 'No fresh claims this run'}
                  </p>
                  <p className="mt-1 text-label-small text-foreground/80">
                    {harvestResult.searchHits} search hits · {harvestResult.aiItems} AI items ·{' '}
                    dropped {harvestResult.droppedUnverified} low-confidence ·{' '}
                    dropped {harvestResult.droppedDuplicate} duplicate
                    {harvestResult.droppedDuplicate === 1 ? '' : 's'} ·{' '}
                    {(harvestResult.durationMs / 1000).toFixed(1)}s
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setHarvestResult(null)}
                  aria-label="Dismiss harvest result"
                  className="grid size-7 shrink-0 place-items-center rounded-md border-2 border-black bg-background/40 transition-colors hover:bg-background/60"
                >
                  <X size={14} strokeWidth={2.5} aria-hidden="true" />
                </button>
              </motion.div>
            )}
            {harvestMutation.isError && !harvestResult && (
              <motion.div
                key="harvest-error"
                initial={reduce ? false : { opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98 }}
                transition={{ duration: 0.4, ease: EASE }}
                className="mb-5 flex items-start gap-3 rounded-lg border-2 border-black bg-danger p-4 text-danger-foreground shadow-hard-sm"
                role="alert"
                aria-live="assertive"
              >
                <div className="flex-1">
                  <p className="font-semibold">Harvest failed</p>
                  <p className="mt-1 text-label-small">
                    {(harvestMutation.error as Error).message}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => harvestMutation.reset()}
                  aria-label="Dismiss harvest error"
                  className="grid size-7 shrink-0 place-items-center rounded-md border-2 border-black bg-danger-foreground/20 transition-colors hover:bg-danger-foreground/30"
                >
                  <X size={14} strokeWidth={2.5} aria-hidden="true" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

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

              {/* Right-side meta — streak chip */}
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

            {/* Admin toolbar — only renders for admins. Sits between the page
                header and the progress rail so it's hard to miss during demo
                but doesn't crowd the main feed UI for normal users. */}
            {user?.isAdmin && (
              <motion.div
                initial={reduce ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: EASE, delay: 0.45 }}
                className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border-2 border-black bg-pink-accent/20 px-3 py-2 shadow-hard-sm"
                role="region"
                aria-label="Admin tools"
              >
                <span className="inline-flex items-center gap-1.5 rounded-md border-2 border-black bg-foreground px-2 py-0.5 text-label-small font-bold uppercase tracking-wider text-background">
                  Admin
                </span>
                <HarvestTriggerButton
                  isPending={harvestMutation.isPending}
                  onClick={() => harvestMutation.mutate()}
                />
                <span className="text-label-small text-foreground/70">
                  Manually pull trending misinformation + scams from the web into this feed.
                </span>
              </motion.div>
            )}

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

            {/* Date-range filter — sliding-pill segmented control + inline custom range */}
            <motion.div
              className="mt-5"
              variants={{
                hidden: {},
                show: { transition: { staggerChildren: 0.04, delayChildren: 0.5 } },
              }}
            >
              <div className="flex flex-wrap items-center gap-3">
                {/* Section label */}
                <div className="inline-flex items-center gap-1.5 text-foreground/60">
                  <Calendar size={13} aria-hidden="true" strokeWidth={2.5} />
                  <span className="font-display text-label-small font-semibold uppercase tracking-wider">
                    When
                  </span>
                </div>

                {/* Segmented control — sliding indicator (layoutId) animates
                    between presets. */}
                <div
                  role="tablist"
                  aria-label="Date range preset"
                  className="flex max-w-full flex-wrap items-center gap-0.5 rounded-full border-2 border-black bg-muted p-1 shadow-hard-sm"
                >
                  {(
                    [
                      { key: 'all', label: 'All time', short: 'All' },
                      { key: 'today', label: 'Today', short: 'Today' },
                      { key: 'yesterday', label: 'Yesterday', short: 'Yest.' },
                      { key: 'last3', label: 'Last 3 days', short: '3 days' },
                      { key: 'last7', label: 'Last 7 days', short: '7 days' },
                      { key: 'custom', label: 'Custom range', short: 'Custom' },
                    ] as const
                  ).map(({ key, label, short }) => {
                    const isActive = datePreset === key;
                    return (
                      <motion.button
                        key={key}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => setDatePreset(key)}
                        variants={{
                          hidden: { opacity: 0, y: 4 },
                          show: { opacity: 1, y: 0 },
                        }}
                        transition={{ duration: 0.35, ease: EASE }}
                        whileTap={{ scale: 0.96 }}
                        className={`relative inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-label-small font-semibold transition-colors duration-200 sm:px-3.5 ${
                          isActive
                            ? 'text-foreground'
                            : 'text-foreground/55 hover:text-foreground'
                        }`}
                      >
                        {/* Sliding pill — only the active button renders it,
                            motion animates it between buttons via layoutId. */}
                        {isActive && (
                          <motion.span
                            layoutId="date-pill-active"
                            className="absolute inset-0 rounded-full border-2 border-black bg-background shadow-hard-sm"
                            transition={{
                              type: 'spring',
                              stiffness: 420,
                              damping: 32,
                            }}
                          />
                        )}
                        <span className="relative z-10 hidden sm:inline">
                          {label}
                        </span>
                        <span className="relative z-10 sm:hidden">{short}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Custom range card — slides open below the segmented control */}
              <AnimatePresence initial={false}>
                {datePreset === 'custom' && (
                  <motion.div
                    key="custom-range"
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    transition={{ duration: 0.28, ease: EASE }}
                    className="overflow-hidden"
                  >
                    <div className="flex flex-col gap-2 rounded-2xl border-2 border-black bg-card p-2.5 shadow-hard sm:flex-row sm:flex-wrap sm:items-center">
                      <DateField
                        label="From"
                        value={customRange.from}
                        max={customRange.to || undefined}
                        onChange={(v) =>
                          setCustomRange((r) => ({ ...r, from: v }))
                        }
                      />
                      <ArrowRight
                        size={14}
                        aria-hidden="true"
                        className="hidden shrink-0 -rotate-90 text-foreground/40 sm:inline-block sm:rotate-0"
                        strokeWidth={2.5}
                      />
                      <DateField
                        label="To"
                        value={customRange.to}
                        min={customRange.from || undefined}
                        onChange={(v) => setCustomRange((r) => ({ ...r, to: v }))}
                      />
                      {(customRange.from || customRange.to) && (
                        <motion.button
                          type="button"
                          onClick={() => setCustomRange({ from: '', to: '' })}
                          whileTap={{ scale: 0.94 }}
                          className="inline-flex items-center justify-center gap-1 self-end rounded-full border-2 border-black bg-background px-2.5 py-1 text-label-small font-semibold text-foreground/70 transition-colors hover:border-danger hover:bg-danger hover:text-danger-foreground sm:ml-auto"
                        >
                          <X size={10} strokeWidth={3} aria-hidden="true" />
                          Clear
                        </motion.button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

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
              <p className="font-display text-heading-2 font-semibold">
                {datePreset === 'all'
                  ? 'No claims yet'
                  : 'No claims in this date range'}
              </p>
              <p className="mt-2 text-body text-foreground/70">
                {datePreset === 'all'
                  ? "The team is curating today's batch. Check back in a few minutes."
                  : 'Try widening the range — or hit "All time" to see everything.'}
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

          {/* Vote-error toast (sticky to the top of the feed so the user
              doesn't have to scroll past a bunch of cards to see it). */}
          <AnimatePresence>
            {voteMutation.isError && (
              <motion.div
                key="vote-error"
                initial={reduce ? false : { opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98 }}
                transition={{ duration: 0.4, ease: EASE }}
                className="mb-5 flex items-start gap-3 rounded-lg border-2 border-black bg-danger p-4 text-danger-foreground shadow-hard"
                role="alert"
                aria-live="assertive"
              >
                <div className="flex-1">
                  <p className="font-semibold">Vote failed</p>
                  <p className="mt-1 text-label-small">
                    {(voteMutation.error as Error).message}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => voteMutation.reset()}
                  aria-label="Dismiss vote error"
                  className="grid size-7 shrink-0 place-items-center rounded-md border-2 border-black bg-danger-foreground/20 transition-colors hover:bg-danger-foreground/30"
                >
                  <X size={14} strokeWidth={2.5} aria-hidden="true" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
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

      {/* ── Badge-unlocked ceremony ── */}
      <BadgeUnlockedModal
        badges={unlockedBadges}
        onClose={() => setUnlockedBadges([])}
      />
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

/* ── Admin: manual harvest trigger ─────────────────────────────────────── */

/**
 * Admin-only button — fires `POST /api/admin/harvest`, which runs one
 * synchronous pass of the hourly claim-harvester cron. Spins while in
 * flight so the operator can see the job is working (a single harvest
 * usually takes 2–6s: web search + AI call + inserts).
 *
 * Kept narrow so it can sit next to the streak chip without crowding
 * the page header.
 */
function HarvestTriggerButton({
  isPending,
  onClick,
}: {
  isPending: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={isPending}
      whileTap={isPending ? undefined : { scale: 0.95 }}
      whileHover={isPending ? undefined : { scale: 1.04 }}
      className={[
        'inline-flex items-center gap-1.5 rounded-lg border-2 border-black px-2.5 py-1 text-label-small font-bold uppercase tracking-wider shadow-hard-sm transition-all',
        'bg-pink-accent text-foreground',
        isPending ? 'cursor-wait opacity-70' : 'hover-lift',
      ].join(' ')}
      aria-label={isPending ? 'Refreshing claims feed…' : 'Refresh claims from the web'}
    >
      <motion.span
        aria-hidden
        animate={isPending ? { rotate: 360 } : { rotate: [0, -8, 8, 0] }}
        transition={
          isPending
            ? { duration: 1, repeat: Infinity, ease: 'linear' }
            : { duration: 2, repeat: Infinity, ease: 'easeInOut' }
        }
      >
        <Wand2 size={14} strokeWidth={2.5} aria-hidden="true" />
      </motion.span>
      <span>{isPending ? 'Refreshing…' : 'Refresh feed'}</span>
    </motion.button>
  );
}

/**
 * Compact labeled date input — used inside the "Custom range" picker card.
 * The native HTML5 date picker gives us locale-aware UI and keyboard
 * support for free; we wrap it so the chrome matches the Gumroad-style
 * 2px-black-border inputs used everywhere else.
 */
function DateField({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  min?: string;
  max?: string;
}) {
  return (
    <label className="group flex min-w-0 flex-1 items-center gap-1.5 rounded-md border-2 border-black bg-background px-2 py-1 text-label-small font-semibold text-foreground transition-colors focus-within:bg-highlight focus-within:text-highlight-foreground hover:bg-background sm:flex-none">
      <span className="shrink-0 text-label-small font-semibold uppercase tracking-wider text-foreground/60 group-focus-within:text-highlight-foreground">
        {label}
      </span>
      <input
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-0 w-full cursor-pointer border-0 bg-transparent p-0 text-label-small font-semibold text-foreground focus:outline-none focus:ring-0 group-focus-within:text-highlight-foreground sm:w-32"
      />
    </label>
  );
}
