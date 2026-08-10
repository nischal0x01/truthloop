/* Hallmark · page: feed · genre: app-shell · theme: Gumroad system
 *
 * Authenticated claims feed. Loads published claims + the current user's
 * guess map in parallel, then renders one ClaimCard per claim.
 *
 * Voting flow:
 *   - mutation posts to /api/claims/:id/guess with the chosen answer
 *   - on success: optimistically write the guess to the my-guesses cache
 *     and invalidate the claims list (vote_count goes up)
 *   - on error: surface in a toast (TODO when toaster lands) and revert
 */

import { useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LogOut, Sparkles, TrendingUp } from 'lucide-react';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { ClaimCard, ClaimCardSkeleton } from '@/components/feed/ClaimCard';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/auth/UserAvatar';
import {
  claimKeys,
  claimsApi,
  type Claim,
  type ClaimVerdict,
} from '@/lib/claims';

interface FeedProps {
  /**
   * Optional initial search string (e.g. `?welcome=true` from OAuth callback).
   * The parent `RootRoute` passes `location.search` so we preserve it across
   * the mount boundary.
   */
  initialSearch?: string;
}

export function Feed({ initialSearch = '' }: FeedProps) {
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

  // Touch initialSearch so the prop is read at least once (avoids "unused var"
  // warnings while making the intent explicit).
  useEffect(() => {
    if (initialSearch && !searchParams.toString()) {
      // Defensive — if for any reason the URL stripped params during mount,
      // restore them so the welcome banner still shows.
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
      // Optimistic update: lock the card immediately, mark as pending.
      await qc.cancelQueries({ queryKey: claimKeys.myGuesses() });
      const prev = qc.getQueryData<ReturnType<typeof claimsApi.myGuesses> extends Promise<infer R> ? R extends { guesses: infer G } ? G : never : never>(
        claimKeys.myGuesses()
      );
      qc.setQueryData(
        claimKeys.myGuesses(),
        (cur: ReturnType<typeof claimsApi.myGuesses> extends Promise<infer R> ? R extends { guesses: infer G } ? G : never : never) => ({
          ...(cur ?? {}),
          [claimId]: { answer, correct: false }, // server is the source of truth
        })
      );
      return { prev };
    },

    onError: (_err, _vars, ctx) => {
      // Revert optimistic write.
      if (ctx?.prev) qc.setQueryData(claimKeys.myGuesses(), ctx.prev);
    },

    onSuccess: (result, { claimId }) => {
      type GuessesMap = ReturnType<typeof claimsApi.myGuesses> extends Promise<infer R> ? R extends { guesses: infer G } ? G : never : never;
      qc.setQueryData<GuessesMap>(
        claimKeys.myGuesses(),
        (cur) => ({
          ...(cur ?? {}),
          [claimId]: { answer: result.guess.userAnswer, correct: result.guess.isCorrect },
        })
      );
      // Vote count went up — revalidate the list.
      qc.invalidateQueries({ queryKey: claimKeys.list() });
      // User's points may have changed — revalidate /me.
      qc.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  });

  /* ── Derived ── */
  const claims: Claim[] = claimsQuery.data ?? [];
  const guesses = guessesQuery.data ?? {};
  const isInitialLoading = claimsQuery.isLoading && !claimsQuery.data;
  const error = (claimsQuery.error || guessesQuery.error) as Error | null;

  /* ── Vote handler ── */
  const handleVote = (claimId: string, answer: ClaimVerdict) => {
    voteMutation.mutate({ claimId, answer });
  };

  /* ── Renders ── */
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Top bar ── */}
      <header className="sticky top-0 z-30 bg-background border-b-2 border-black">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-4">
          <Link
            to="/"
            className="flex items-center gap-2 text-label font-semibold tracking-[-0.02em]"
          >
            <ShieldCheck size={20} strokeWidth={2.2} aria-hidden="true" />
            <span>TruthLoop</span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="hidden text-label text-foreground hover:underline underline-offset-4 sm:inline"
            >
              Dashboard
            </Link>
            {user && (
              <>
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

      {/* ── Body ── */}
      <main className="mx-auto max-w-3xl px-6 py-8">
        {/* Welcome banner (post-OAuth) */}
        {isWelcome && user && (
          <div className="mb-6 flex items-start gap-3 rounded-lg border-2 border-black bg-highlight p-4 shadow-hard-sm">
            <Sparkles size={20} aria-hidden="true" />
            <div>
              <p className="font-medium">Welcome, {user.displayName.split(' ')[0]}!</p>
              <p className="text-label-small text-foreground/80">
                Vote on a claim to earn your first 10 points.
              </p>
            </div>
          </div>
        )}

        {/* Page header */}
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-label-small uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <TrendingUp size={14} aria-hidden="true" />
              Today's claims
            </p>
            <h1 className="mt-1 text-display-medium font-medium tracking-[-0.02em]">
              Real or fake?
            </h1>
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div className="mb-6 rounded-lg border-2 border-black bg-danger p-4 text-danger-foreground">
            <p className="font-medium">Couldn't load claims.</p>
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
            <p className="text-heading-2 font-medium">No claims yet</p>
            <p className="mt-2 text-body text-muted-foreground">
              The team is curating today's batch. Check back in a few minutes.
            </p>
          </div>
        )}

        {/* Feed */}
        {!isInitialLoading && claims.length > 0 && (
          <div className="space-y-5">
            {claims.map((claim) => {
              const userGuess = guesses[claim.id];
              const isVotingThis =
                voteMutation.isPending && voteMutation.variables?.claimId === claim.id;
              return (
                <ClaimCard
                  key={claim.id}
                  claim={claim}
                  userGuess={userGuess}
                  isVoting={isVotingThis}
                  onVote={(answer) => handleVote(claim.id, answer)}
                />
              );
            })}
          </div>
        )}

        {/* Vote-error toast-style banner */}
        {voteMutation.isError && (
          <div
            className="mt-6 rounded-lg border-2 border-black bg-danger p-4 text-danger-foreground"
            role="alert"
          >
            <p className="font-medium">Vote failed</p>
            <p className="mt-1 text-label-small">
              {(voteMutation.error as Error).message}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}