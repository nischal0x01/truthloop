/**
 * Forecast — authenticated /forecast page.
 *
 * Three responsibilities (top to bottom):
 *   1. Editorial Split hero — date + generation status + live tallies
 *   2. Day picker — chips for last 3 days, newest first
 *   3. Severity cards — one per forecast item, sorted High → Medium → Low,
 *      with Believe / Doubt / Skip vote buttons. The current viewer's vote
 *      is highlighted; counts update optimistically.
 *
 * Data:
 *   - GET /api/forecast/today   (today's forecast; auto-generated on first hit)
 *   - GET /api/forecast/history  (last N days, newest first)
 *   - POST /api/forecast/:itemId/vote   (sets/overwrites the caller's vote)
 *
 * Motion: matches the project's [0.32, 0.72, 0, 1] cubic-bezier for hero
 * mask-reveal and card stagger.
 */

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'motion/react';
import {
  Radar,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { AppNav } from '@/components/AppNav';
import { EASE } from '@/lib/motion';
import {
  applyVoteToCache,
  fetchForecastHistory,
  fetchTodayForecast,
  forecastKeys,
  regenerateForecast,
  voteOnForecastItem,
  type Forecast,
  type ForecastItem,
  type ForecastVoteValue,
} from '@/actions/forecasts';

/* ── Helpers ── */

const SEVERITY_BG: Record<ForecastItem['severity'], string> = {
  high: 'bg-danger text-danger-foreground',
  medium: 'bg-warning text-warning-foreground',
  low: 'bg-card text-card-foreground',
};

const SEVERITY_CHIP: Record<ForecastItem['severity'], string> = {
  high: 'bg-foreground text-background',
  medium: 'bg-foreground text-background',
  low: 'bg-card text-foreground',
};

const VOTE_LABEL: Record<ForecastVoteValue, string> = {
  believe: 'I believe this',
  doubt: "Don't buy it",
  skip: 'Skip',
};

const VOTE_BG_ACTIVE: Record<ForecastVoteValue, string> = {
  believe: 'bg-accent text-accent-foreground',
  doubt: 'bg-panel text-panel-foreground',
  skip: 'bg-muted text-foreground',
};

/** "Today" / "Yesterday" / "Tue, 12 Aug" — used in the day-picker chip. */
function dayChipLabel(dateStr: string, isToday: boolean): string {
  if (isToday) return 'Today';
  // Compare to yesterday UTC.
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setUTCDate(today.getUTCDate() - 1);
  const yIso = yesterday.toISOString().slice(0, 10);
  if (dateStr === yIso) return 'Yesterday';
  const d = new Date(`${dateStr}T00:00:00Z`);
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/* ── Page ── */

export function Forecast() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Today's forecast — auto-generated server-side if missing.
  const todayQuery = useQuery({
    queryKey: forecastKeys.today(),
    queryFn: fetchTodayForecast,
    staleTime: 30_000,
  });

  // History — used for the day picker. Lazy load so the page is fast on first paint.
  const historyQuery = useQuery({
    queryKey: forecastKeys.history(3),
    queryFn: () => fetchForecastHistory(3),
    staleTime: 60_000,
  });

  // The active forecast is either today (default) or one of the previous days.
  const activeForecast: Forecast | undefined = useMemo(() => {
    if (!selectedDate) return todayQuery.data;
    return historyQuery.data?.find((f) => f.date === selectedDate);
  }, [selectedDate, todayQuery.data, historyQuery.data]);

  // ── Mutations ──
  const voteMutation = useMutation({
    mutationFn: ({ itemId, vote }: { itemId: string; vote: ForecastVoteValue }) =>
      voteOnForecastItem(itemId, vote),
    onSuccess: (item) => applyVoteToCache(item),
  });

  const regenerateMutation = useMutation({
    mutationFn: regenerateForecast,
    onSuccess: (forecast) => {
      queryClient.setQueryData(forecastKeys.today(), forecast);
    },
  });

  // ── Derived UI ──
  const highCount = activeForecast?.items.filter((i) => i.severity === 'high').length ?? 0;
  const totalVotes =
    activeForecast?.items.reduce(
      (sum, i) => sum + i.believeCount + i.doubtCount + i.skipCount,
      0
    ) ?? 0;

  const dayChips = useMemo(() => {
    const today = todayQuery.data;
    const history = historyQuery.data ?? [];
    if (!today) return [];
    return [today, ...history.filter((h) => h.date !== today.date)].slice(0, 3);
  }, [todayQuery.data, historyQuery.data]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppNav />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden border-b-2 border-black">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 left-1/3 h-130 w-130 rounded-full opacity-40"
          style={{
            background:
              'radial-gradient(circle at center, rgba(241,243,51,0.5) 0%, rgba(241,243,51,0) 60%)',
          }}
        />
        <div className="relative mx-auto max-w-[1600px] px-6 py-16 md:py-24">
          <motion.div
            className="grid gap-10 md:grid-cols-[1.4fr_1fr] md:items-end"
            initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.9, ease: EASE }}
          >
            <div className="flex flex-col gap-3">
              <p className="flex items-center gap-2 text-label-small font-semibold uppercase tracking-[0.08em]">
                <Radar size={14} aria-hidden="true" />
                Daily scam forecast
              </p>
              <h1
                className="font-display text-display-large leading-[0.95]"
                style={{ minWidth: 0, overflowWrap: 'anywhere' }}
              >
                What scammers are doing today.
              </h1>
              <p className="mt-2 max-w-2xl text-body-large text-foreground/80">
                Each morning at 06:00 UTC, our AI reads the last 48 hours of
                headlines and the last week of reported scam patterns, then
                writes the forecasts for the next seven days.
              </p>
            </div>

            {/* Live stats card */}
            <div className="grid grid-cols-3 gap-3">
              <StatTile
                label="Items today"
                value={activeForecast?.items.length ?? 0}
              />
              <StatTile
                label="High severity"
                value={highCount}
                accent="text-danger-foreground bg-danger"
              />
              <StatTile label="Community votes" value={totalVotes} />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Day picker + actions ── */}
      <section className="border-b-2 border-black bg-background">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex flex-wrap items-center gap-2">
            {dayChips.length === 0 ? (
              <SkeletonChip />
            ) : (
              dayChips.map((f, idx) => {
                const isActive = (selectedDate ?? dayChips[0]?.date) === f.date;
                return (
                  <button
                    key={f.date}
                    type="button"
                    onClick={() => setSelectedDate(idx === 0 ? null : f.date)}
                    className={[
                      'inline-flex items-center gap-2 rounded-pill border-2 border-black px-4 py-1.5 text-label-small font-semibold transition-all',
                      isActive
                        ? 'bg-foreground text-background'
                        : 'bg-card text-foreground hover-lift',
                    ].join(' ')}
                    aria-pressed={isActive}
                  >
                    {dayChipLabel(f.date, idx === 0)}
                  </button>
                );
              })
            )}
          </div>

          <button
            type="button"
            onClick={() => regenerateMutation.mutate()}
            disabled={regenerateMutation.isPending || !selectedDate}
            className="inline-flex items-center gap-2 rounded-lg border-2 border-black bg-card px-4 py-2 text-label-small font-semibold hover-lift disabled:opacity-50 disabled:cursor-not-allowed"
            title={
              selectedDate
                ? 'Regeneration is only available for today.'
                : 'Re-run the AI prompt and overwrite today’s forecast.'
            }
          >
            <RefreshCw
              size={14}
              className={regenerateMutation.isPending ? 'animate-spin' : ''}
              aria-hidden="true"
            />
            Regenerate today
          </button>
        </div>
      </section>

      {/* ── Forecast items ── */}
      <main className="mx-auto max-w-[1600px] px-6 py-12">
        {todayQuery.isPending && !activeForecast ? (
          <ForecastSkeleton />
        ) : todayQuery.isError ? (
          <ErrorState
            message="Couldn't load today's forecast. Try refreshing — your previous votes are safe."
            onRetry={() => queryClient.invalidateQueries({ queryKey: forecastKeys.all })}
          />
        ) : !activeForecast ? (
          <EmptyState />
        ) : activeForecast.items.length === 0 ? (
          <EmptyState
            title="No items for this day yet."
            body="Check back after the morning refresh — items usually appear by 06:30 UTC."
          />
        ) : (
          <motion.ul
            key={activeForecast.date}
            className="grid gap-5 md:grid-cols-3"
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.1 } },
            }}
          >
            <AnimatePresence mode="popLayout">
              {activeForecast.items.map((item) => (
                <ForecastCard
                  key={item.id}
                  item={item}
                  pendingVote={voteMutation.isPending}
                  onVote={(vote) =>
                    voteMutation.mutate({ itemId: item.id, vote })
                  }
                />
              ))}
            </AnimatePresence>
          </motion.ul>
        )}
      </main>
    </div>
  );
}

/* ── Subcomponents ── */

function StatTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <div
      className={[
        'rounded-lg border-2 border-black p-4 shadow-hard',
        accent ?? 'bg-card text-card-foreground',
      ].join(' ')}
    >
      <div className="text-display-medium font-display leading-none">{value}</div>
      <div className="mt-1 text-label-small font-semibold uppercase tracking-[0.08em] opacity-80">
        {label}
      </div>
    </div>
  );
}

function ForecastCard({
  item,
  pendingVote,
  onVote,
}: {
  item: ForecastItem;
  pendingVote: boolean;
  onVote: (vote: ForecastVoteValue) => void;
}) {
  return (
    <motion.li
      layout
      variants={{
        hidden: { opacity: 0, y: 28, filter: 'blur(10px)' },
        show: { opacity: 1, y: 0, filter: 'blur(0px)' },
      }}
      transition={{ duration: 0.7, ease: EASE }}
      whileHover={{ y: -4 }}
      className="group relative cursor-default rounded-4xl border-2 border-black p-1.5 shadow-hard transition-transform duration-500"
      style={{ minWidth: 0 }}
    >
      <div
        className={[
          'flex h-full flex-col gap-3 rounded-[1.625rem] border-2 border-black p-6',
          SEVERITY_BG[item.severity],
        ].join(' ')}
      >
        {/* Header row */}
        <div className="flex items-center justify-between">
          <span
            className={[
              'inline-flex items-center gap-2 rounded-pill border-2 border-black px-3 py-1 text-label-small font-semibold uppercase tracking-[0.08em]',
              SEVERITY_CHIP[item.severity],
            ].join(' ')}
          >
            {item.severity === 'high' ? (
              <AlertTriangle size={12} aria-hidden="true" />
            ) : item.severity === 'medium' ? (
              <Sparkles size={12} aria-hidden="true" />
            ) : (
              <CheckCircle2 size={12} aria-hidden="true" />
            )}
            {item.severity}
          </span>
          <span className="text-label-small font-mono uppercase tracking-[0.15em] opacity-70">
            {item.category.replace(/_/g, ' ')}
          </span>
        </div>

        <h3
          className="font-display text-heading-2"
          style={{ minWidth: 0, overflowWrap: 'anywhere' }}
        >
          {item.title}
        </h3>

        <p className="text-body opacity-90">{item.summary}</p>

        {item.recommendedAction && (
          <p className="text-label-small opacity-80">
            <span className="font-semibold uppercase tracking-[0.08em]">
              Watch for:
            </span>{' '}
            {item.recommendedAction}
          </p>
        )}

        {/* Vote buttons */}
        <div className="mt-auto flex flex-wrap gap-2 pt-4">
          {(Object.keys(VOTE_LABEL) as ForecastVoteValue[]).map((v) => {
            const isActive = item.myVote === v;
            return (
              <button
                key={v}
                type="button"
                onClick={() => onVote(v)}
                disabled={pendingVote}
                aria-pressed={isActive}
                className={[
                  'inline-flex items-center gap-1.5 rounded-md border-2 border-black px-3 py-1.5 text-label-small font-semibold transition-all',
                  'disabled:cursor-not-allowed disabled:opacity-60',
                  isActive
                    ? `${VOTE_BG_ACTIVE[v]} shadow-hard`
                    : 'bg-card text-foreground hover-lift',
                ].join(' ')}
              >
                {v === 'believe' && <CheckCircle2 size={12} aria-hidden="true" />}
                {v === 'doubt' && <AlertTriangle size={12} aria-hidden="true" />}
                {v === 'skip' && <Sparkles size={12} aria-hidden="true" />}
                {VOTE_LABEL[v]}
              </button>
            );
          })}
        </div>

        {/* Tally */}
        <div className="flex items-center gap-3 text-label-small opacity-80">
          <span>
            <strong>{item.believeCount}</strong> believe
          </span>
          <span aria-hidden="true">·</span>
          <span>
            <strong>{item.doubtCount}</strong> doubt
          </span>
          <span aria-hidden="true">·</span>
          <span>
            <strong>{item.skipCount}</strong> skip
          </span>
        </div>
      </div>
    </motion.li>
  );
}

function ForecastSkeleton() {
  return (
    <ul className="grid gap-5 md:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <li
          key={i}
          className="rounded-4xl border-2 border-black bg-card p-1.5 shadow-hard"
        >
          <div className="flex h-full flex-col gap-3 rounded-[1.625rem] border-2 border-black p-6">
            <div className="h-6 w-24 animate-pulse rounded-pill bg-muted" />
            <div className="h-7 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
            <div className="mt-auto h-9 w-full animate-pulse rounded-md bg-muted" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function SkeletonChip() {
  return (
    <div className="flex gap-2">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-8 w-24 animate-pulse rounded-pill bg-muted"
        />
      ))}
    </div>
  );
}

function EmptyState({
  title = "Today's forecast isn't ready yet.",
  body = 'It usually appears by 06:30 UTC. If it’s past that, the AI generation may have failed — try Regenerate above.',
}: {
  title?: string;
  body?: string;
}) {
  return (
    <div className="mx-auto max-w-xl rounded-2xl border-2 border-black bg-card p-10 text-center shadow-hard">
      <Radar className="mx-auto mb-4 size-10 text-foreground/70" aria-hidden="true" />
      <h2 className="font-display text-heading-2">{title}</h2>
      <p className="mt-2 text-body text-foreground/80">{body}</p>
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="mx-auto max-w-xl rounded-2xl border-2 border-black bg-danger/10 p-10 text-center shadow-hard">
      <AlertTriangle className="mx-auto mb-4 size-10 text-danger" aria-hidden="true" />
      <h2 className="font-display text-heading-2">Something broke.</h2>
      <p className="mt-2 text-body text-foreground/80">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-6 inline-flex items-center gap-2 rounded-lg border-2 border-black bg-card px-4 py-2 text-label-small font-semibold hover-lift"
      >
        <RefreshCw size={14} aria-hidden="true" />
        Try again
      </button>
    </div>
  );
}
