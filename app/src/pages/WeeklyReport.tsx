/**
 * WeeklyReport — standalone page at /reports/weekly.
 *
 * "The wow moment" in the pitch. Five sections, in order:
 *   1. Accuracy       — hero figure + You/Global meters + outcome donut
 *   2. Blind spot     — dark card with category chip + narrative
 *   3. Trend          — daily accuracy (area) + daily volume (bars)
 *   4. Categories     — horizontal bar chart, blind-spot in pink, rest gray
 *   5. Replay         — single claim card with full context
 *
 * Layout archetype: Editorial Split (Section 3.B of high-end-visual-design).
 *   - Massive headline + meta left, accuracy tile right
 *   - Sticky on-this-page pill nav under the hero (clear section progress)
 *
 * Range filter at the top (RangePicker) refetches with new query params;
 * week/month/quarter/custom are all server-computed.
 */

import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import {
  ArrowUpRight,
  CalendarDays,
  Crosshair,
  Eye,
  FileBarChart,
  Loader2,
  RefreshCw,
  Sparkles,
  Target,
  Trophy,
} from 'lucide-react';
import { AppNav } from '@/components/AppNav';
import {
  AccuracyComparison,
  CategoryBarChart,
  OutcomeDonut,
  TrendArea,
} from '@/components/reports/ReportCharts';
import { RangePicker } from '@/components/reports/RangePicker';
import { rangeFromParams } from '@/actions/reports';
import {
  categoryLabel,
  getWeeklyRangeQuery,
  rangeHeadline,
  rangeSubhead,
  rangeTitle,
  regenerateWeeklyReportMutation,
  type Range,
  type WeeklyReport as WeeklyReportData,
} from '@/actions/reports';
import { EASE } from '@/lib/motion';

const CATEGORY_TONE: Record<
  string,
  { bg: string; ink: string; emoji: string }
> = {
  factual_statement: { bg: 'bg-yellow', ink: 'text-highlight-foreground', emoji: '📋' },
  outdated_info: { bg: 'bg-accent', ink: 'text-accent-foreground', emoji: '⏳' },
  misleading_omission: { bg: 'bg-pink-accent', ink: 'text-black', emoji: '🕳️' },
  manipulated_stat: { bg: 'bg-orange', ink: 'text-black', emoji: '📊' },
  misattributed_quote: { bg: 'bg-real', ink: 'text-real-foreground', emoji: '💬' },
  satire_mistaken_as_real: { bg: 'bg-highlight', ink: 'text-highlight-foreground', emoji: '🎭' },
  survey_stat: { bg: 'bg-muted', ink: 'text-foreground', emoji: '📈' },
  conspiracy_theory: { bg: 'bg-dark-panel', ink: 'text-white', emoji: '🛰️' },
  misattributed_threat: { bg: 'bg-red', ink: 'text-white', emoji: '⚠️' },
  unverified_claim: { bg: 'bg-muted', ink: 'text-foreground', emoji: '❔' },
};

function toneFor(category: string | null) {
  if (!category) return { bg: 'bg-muted', ink: 'text-foreground', emoji: '🎯' };
  return CATEGORY_TONE[category] ?? { bg: 'bg-muted', ink: 'text-foreground', emoji: '🎯' };
}

const SECTIONS = [
  { id: 'accuracy', label: 'Accuracy', short: '1' },
  { id: 'blindspot', label: 'Blind spot', short: '2' },
  { id: 'trend', label: 'Trend', short: '3' },
  { id: 'categories', label: 'Categories', short: '4' },
  { id: 'replay', label: 'Replay', short: '5' },
];

export function WeeklyReport() {
  const navigate = useNavigate();
  const [regenToast, setRegenToast] = useState<string | null>(null);
  const [searchParams] = useSearchParams();

  // Range state, synced to URL search params.
  const range: Range = useMemo(
    () => rangeFromParams(searchParams),
    [searchParams]
  );

  const reportQuery = useQuery(getWeeklyRangeQuery(range));

  const regenMutation = useMutation({
    ...regenerateWeeklyReportMutation(),
    onSuccess: () => {
      setRegenToast('Report regenerated.');
      setTimeout(() => setRegenToast(null), 3500);
    },
    onError: () => {
      setRegenToast('Could not regenerate. Try again.');
      setTimeout(() => setRegenToast(null), 3500);
    },
  });

  const report = reportQuery.data?.report ?? null;

  const handleRegenerate = useCallback(() => {
    regenMutation.mutate();
  }, [regenMutation]);

  const rangeLabel = useMemo(() => {
    if (reportQuery.data?.range) {
      return reportQuery.data.range.label;
    }
    if (range.kind === 'week') return 'Last 7 days';
    if (range.kind === 'month') return 'This month';
    if (range.kind === 'quarter') return 'Last 3 months';
    return 'Custom range';
  }, [reportQuery.data?.range, range.kind]);

  const showRegen = range.kind === 'week';

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppNav showClaims={true} />

      <main className="mx-auto max-w-6xl px-4 pb-20 pt-6 sm:px-6 lg:px-8">
        {/* ── Editorial hero (always shown) ── */}
        <HeroBlock
          report={report}
          isLoading={reportQuery.isLoading}
          range={range}
          rangeLabel={rangeLabel}
        />

        {/* ── RangePicker (always shown, even on empty state) ── */}
        <div className="mt-6">
          <RangePicker
            range={range}
            onChange={(next) => {
              /* The page itself owns range state via the URL — RangePicker writes
                 to useSearchParams on its own. This onChange is a no-op here
                 but kept in the contract so the picker is drop-in. */
              void next;
            }}
            isLoading={reportQuery.isFetching}
          />
        </div>

        {/* ── On-this-page sub-nav (sticky) — only when populated ── */}
        {report && <SectionNav />}

        {/* ── Content ── */}
        <div className="mt-8">
          {reportQuery.isLoading ? (
            <ReportSkeleton />
          ) : !report ? (
            <EmptyState
              onRegenerate={handleRegenerate}
              isRegenerating={regenMutation.isPending}
              hasVotes={regenMutation.isSuccess || reportQuery.isFetched}
              range={range}
            />
          ) : (
            <motion.div
              initial="hidden"
              animate="show"
              variants={{
                hidden: {},
                show: { transition: { staggerChildren: 0.1, delayChildren: 0.4 } },
              }}
              className="space-y-8"
            >
              <AccuracySection report={report} />
              <BlindSpotSection report={report} />
              <TrendSection report={report} range={range} />
              <CategorySection report={report} />
              <ReplaySection
                report={report}
                onViewClaim={(id) => navigate(`/claims/${id}`)}
              />
              {showRegen && (
                <FooterActions
                  isRegenerating={regenMutation.isPending}
                  onRegenerate={handleRegenerate}
                />
              )}
            </motion.div>
          )}
        </div>
      </main>

      {/* Toast */}
      <AnimatePresence>
        {regenToast && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg border-2 border-black bg-accent px-4 py-3 text-label font-semibold text-accent-foreground shadow-hard"
          >
            <Sparkles size={14} aria-hidden="true" />
            {regenToast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
 * Hero
 * ──────────────────────────────────────────────────────────── */

function HeroBlock({
  report,
  isLoading,
  range,
  rangeLabel,
}: {
  report: WeeklyReportData | null;
  isLoading: boolean;
  range: Range;
  rangeLabel: string;
}) {
  const reduce = useReducedMotion();

  const accuracy = useMemo(() => {
    if (!report) return null;
    if (report.userAccuracy !== null) return Math.round(report.userAccuracy * 100);
    if (report.totalGuesses > 0)
      return Math.round((report.correctGuesses / report.totalGuesses) * 100);
    return null;
  }, [report]);

  const titlePrefix = rangeTitle(range);
  const headlineSuffix = rangeHeadline(range);
  const subhead = rangeSubhead(range);

  return (
    <section className="grain-overlay relative isolate overflow-hidden rounded-4xl border-2 border-black bg-card shadow-hard">
      {/* Ambient orbs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 -top-24 size-112 rounded-full bg-pink-accent/25 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -left-20 size-88 rounded-full bg-yellow/35 blur-3xl"
      />

      <div className="relative grid gap-8 px-6 py-10 sm:px-10 sm:py-14 md:grid-cols-[1.5fr_1fr] md:items-end md:gap-12 md:px-14 md:py-16">
        {/* Left — typography */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
          }}
        >
          <motion.span
            variants={{
              hidden: { opacity: 0, y: 8 },
              show: { opacity: 1, y: 0 },
            }}
            transition={{ duration: 0.5, ease: EASE }}
            className="inline-flex items-center gap-2 rounded-full border-2 border-black bg-card px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em]"
          >
            <span className="grid size-2 place-items-center">
              <span className="size-2 animate-pulse rounded-full bg-pink-accent" />
            </span>
            Blind-Spot Report
          </motion.span>

          <h1 className="relative mt-4 inline-block font-display text-display-xl font-bold leading-[0.92] tracking-display">
            <span className="relative inline-block overflow-hidden align-baseline">
              <motion.span
                className="inline-block"
                variants={{
                  hidden: { y: '110%', opacity: 0 },
                  show: { y: '0%', opacity: 1 },
                }}
                transition={{ duration: 0.9, ease: EASE, delay: 0.1 }}
              >
                {titlePrefix}
              </motion.span>
            </span>
            <br />
            <span className="relative inline-block overflow-hidden align-baseline">
              <motion.span
                className="inline-block"
                variants={{
                  hidden: { y: '110%', opacity: 0 },
                  show: { y: '0%', opacity: 1 },
                }}
                transition={{ duration: 0.9, ease: EASE, delay: 0.22 }}
              >
                {headlineSuffix}
              </motion.span>
            </span>
            {/* Pink underline */}
            <motion.span
              aria-hidden="true"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.8, ease: EASE, delay: 0.85 }}
              style={{ transformOrigin: 'left center' }}
              className="absolute -bottom-2 left-0 h-2 w-32 bg-pink-accent"
            />
          </h1>

          <motion.p
            variants={{
              hidden: { opacity: 0, y: 8 },
              show: { opacity: 1, y: 0 },
            }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.45 }}
            className="mt-6 max-w-xl text-body-large leading-body-large text-foreground/75"
            key={subhead}
          >
            {subhead}
          </motion.p>

          <motion.div
            variants={{
              hidden: { opacity: 0, y: 6 },
              show: { opacity: 1, y: 0 },
            }}
            transition={{ duration: 0.5, ease: EASE, delay: 0.6 }}
            className="mt-5 flex flex-wrap items-center gap-3"
          >
            {report && (
              <span className="inline-flex items-center gap-2 rounded-md border-2 border-black bg-yellow px-3 py-1.5 text-label-small font-semibold">
                <CalendarDays size={13} aria-hidden="true" />
                {rangeLabel}
              </span>
            )}
            <span className="inline-flex items-center gap-2 rounded-md border-2 border-black bg-card px-3 py-1.5 text-label-small font-semibold text-foreground/70">
              <Trophy size={13} aria-hidden="true" />
              Personal report
            </span>
          </motion.div>
        </motion.div>

        {/* Right — hero figure */}
        <motion.div
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12, rotate: -1 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.5 }}
          className="relative"
        >
          <div className="relative overflow-hidden rounded-2xl border-2 border-black bg-dark-panel p-5 text-white shadow-hard">
            {/* Ambient orb inside tile */}
            <div
              aria-hidden
              className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-pink-accent/30 blur-3xl"
            />

            <div className="relative flex items-center justify-between">
              <p className="text-label-small font-bold uppercase tracking-wider text-white/60">
                Accuracy
              </p>
              <Crosshair size={14} aria-hidden="true" className="text-pink-accent" />
            </div>

            {isLoading ? (
              <div className="relative mt-3 h-16 w-32 animate-pulse rounded bg-white/10" />
            ) : (
              <motion.p
                key={`${accuracy}-${range.kind}`}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', damping: 14, stiffness: 240 }}
                className="relative mt-2 font-display text-display-hero font-bold leading-none tracking-display text-pink-accent"
              >
                {accuracy === null ? '—' : `${accuracy}%`}
              </motion.p>
            )}

            <p className="relative mt-2 text-label-small text-white/70">
              {report
                ? `${report.correctGuesses} of ${report.totalGuesses} correct`
                : 'Loading…'}
            </p>

            {report && report.globalAverageAccuracy !== null && accuracy !== null && (
              <div className="relative mt-4 grid grid-cols-2 gap-3 border-t-2 border-white/15 pt-3 text-label-small">
                <div>
                  <p className="uppercase tracking-wider text-white/50">You</p>
                  <p className="mt-1 font-display text-heading-3 font-semibold tabular-nums text-pink-accent">
                    {accuracy}%
                  </p>
                </div>
                <div>
                  <p className="uppercase tracking-wider text-white/50">Global</p>
                  <p className="mt-1 font-display text-heading-3 font-semibold tabular-nums text-yellow">
                    {Math.round(report.globalAverageAccuracy * 100)}%
                  </p>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────
 * On-this-page sticky nav
 * ──────────────────────────────────────────────────────────── */

function SectionNav() {
  return (
    <motion.nav
      aria-label="Sections on this page"
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE, delay: 0.6 }}
      className="sticky top-18 z-30 -mx-4 mt-4 border-y-2 border-black bg-background/90 px-4 py-2 backdrop-blur supports-backdrop-filter:bg-background/75 sm:-mx-6 sm:px-6"
    >
      <ul className="flex items-center gap-1 overflow-x-auto">
        {SECTIONS.map((section) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              className="group inline-flex items-center gap-1.5 rounded-full border-2 border-transparent px-2.5 py-1 text-label-small font-semibold text-foreground/70 transition-colors hover:border-black hover:text-foreground"
            >
              <span className="grid size-5 place-items-center rounded-full border-2 border-black bg-card text-[10px] font-bold text-foreground group-hover:bg-accent">
                {section.short}
              </span>
              {section.label}
            </a>
          </li>
        ))}
      </ul>
    </motion.nav>
  );
}

/* ────────────────────────────────────────────────────────────
 * Section 1 — Accuracy (meters + donut + stat tiles)
 * ──────────────────────────────────────────────────────────── */

function AccuracySection({ report }: { report: WeeklyReportData }) {
  const correct = report.correctGuesses;
  const incorrect = Math.max(0, report.totalGuesses - report.correctGuesses);

  return (
    <motion.section
      id="accuracy"
      variants={{
        hidden: { opacity: 0, y: 16, filter: 'blur(6px)' },
        show: { opacity: 1, y: 0, filter: 'blur(0px)' },
      }}
      transition={{ duration: 0.7, ease: EASE }}
      aria-labelledby="accuracy-heading"
      className="scroll-mt-32 space-y-5"
    >
      <SectionHeader
        eyebrow="Section 1 · Accuracy"
        title="How often did you read the room?"
        id="accuracy-heading"
      />

      {/* Two meter cards side-by-side */}
      <AccuracyComparison
        userAccuracy={report.userAccuracy}
        globalAccuracy={report.globalAverageAccuracy}
      />

      {/* Outcome donut */}
      <OutcomeDonut correct={correct} incorrect={incorrect} />

      {/* Numerator tiles */}
      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Correct" value={correct} accent="bg-real text-real-foreground" />
        <StatTile
          label="Incorrect"
          value={incorrect}
          accent="bg-red text-white"
        />
        <StatTile
          label="Total"
          value={report.totalGuesses}
          accent="bg-card text-foreground"
        />
      </div>
    </motion.section>
  );
}

function StatTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.25, ease: EASE }}
      className={`overflow-hidden rounded-2xl border-2 border-black p-4 shadow-hard-sm ${accent}`}
    >
      <p className="text-label-small font-bold uppercase tracking-wider opacity-80">
        {label}
      </p>
      <p className="mt-1 font-display text-display-medium font-bold leading-none tracking-display tabular-nums">
        {value}
      </p>
    </motion.div>
  );
}

/* ────────────────────────────────────────────────────────────
 * Section 2 — Blind spot
 * ──────────────────────────────────────────────────────────── */

function BlindSpotSection({ report }: { report: WeeklyReportData }) {
  const reduce = useReducedMotion();
  const tone = toneFor(report.blindSpotCategory);

  // Look up the blind-spot row for global-vs-you comparison
  const blindSpotRow = report.categoryBreakdown.find(
    (row) => row.category === report.blindSpotCategory
  );
  const userPct = blindSpotRow ? Math.round(blindSpotRow.accuracy * 100) : null;
  const globalPct =
    report.globalAverageAccuracy !== null
      ? Math.round(report.globalAverageAccuracy * 100)
      : null;

  return (
    <motion.section
      id="blindspot"
      variants={{
        hidden: { opacity: 0, y: 16, filter: 'blur(6px)' },
        show: { opacity: 1, y: 0, filter: 'blur(0px)' },
      }}
      transition={{ duration: 0.7, ease: EASE }}
      aria-labelledby="blindspot-heading"
      className="scroll-mt-32"
    >
      <div className="relative overflow-hidden rounded-4xl border-2 border-black bg-dark-panel p-6 text-white shadow-hard sm:p-8">
        {/* Ambient orb */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-pink-accent/15 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -left-16 size-64 rounded-full bg-yellow/15 blur-3xl"
        />

        <div className="relative">
          <SectionHeader
            eyebrow="Section 2 · Blind spot"
            title="The category that fooled you most."
            id="blindspot-heading"
            tone="dark"
          />

          {/* Category chip */}
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.2 }}
            className="mt-6 flex flex-wrap items-center gap-4"
          >
            <span
              aria-hidden
              className={`grid size-14 place-items-center rounded-2xl border-2 border-black text-3xl shadow-hard-sm ${tone.bg}`}
            >
              {tone.emoji}
            </span>
            <div>
              <p className="text-label-small uppercase tracking-wider text-white/60">
                You missed most often
              </p>
              <p className="font-display text-display-medium font-bold leading-none tracking-display text-pink-accent">
                {categoryLabel(report.blindSpotCategory)}
              </p>
            </div>

            {/* Inline comparison: you vs global for this category */}
            {userPct !== null && (
              <div className="ml-auto flex items-center gap-4 rounded-2xl border-2 border-white/20 bg-white/5 p-3 text-label-small">
                <div>
                  <p className="uppercase tracking-wider text-white/50">You</p>
                  <p className="mt-1 font-display text-heading-3 font-bold tabular-nums text-pink-accent">
                    {userPct}%
                  </p>
                </div>
                <span className="text-white/30">vs</span>
                <div>
                  <p className="uppercase tracking-wider text-white/50">Global</p>
                  <p className="mt-1 font-display text-heading-3 font-bold tabular-nums text-yellow">
                    {globalPct ?? '—'}%
                  </p>
                </div>
              </div>
            )}
          </motion.div>

          {/* Narrative */}
          {report.blindSpotNarrative ? (
            <motion.blockquote
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE, delay: 0.4 }}
              className="relative mt-7 border-l-4 border-pink-accent pl-5 text-body-large leading-body-large"
              style={{ overflowWrap: 'anywhere' }}
            >
              {report.blindSpotNarrative}
            </motion.blockquote>
          ) : (
            <p className="mt-7 text-body-large text-white/70">
              A perfect window — your blind spot is the empty set. Keep voting
              to keep your instincts sharp.
            </p>
          )}
        </div>
      </div>
    </motion.section>
  );
}

/* ────────────────────────────────────────────────────────────
 * Section 3 — Trend (area + volume small multiples)
 * ──────────────────────────────────────────────────────────── */

function TrendSection({
  report,
  range,
}: {
  report: WeeklyReportData;
  range: Range;
}) {
  const isQuarterly = report.trend[0]?.bucket === 'week';

  return (
    <motion.section
      id="trend"
      variants={{
        hidden: { opacity: 0, y: 16, filter: 'blur(6px)' },
        show: { opacity: 1, y: 0, filter: 'blur(0px)' },
      }}
      transition={{ duration: 0.7, ease: EASE }}
      aria-labelledby="trend-heading"
      className="scroll-mt-32 space-y-5"
    >
      <SectionHeader
        eyebrow="Section 3 · Trend"
        title="The shape of your period."
        id="trend-heading"
      />
      <TrendArea trend={report.trend} />

      <p
        className="text-label-small text-foreground/60"
        key={range.kind}
      >
        {isQuarterly ? 'Weekly buckets' : 'Daily points'} · {report.trend.length}{' '}
        bucket{report.trend.length === 1 ? '' : 's'} across the range
      </p>
    </motion.section>
  );
}

/* ────────────────────────────────────────────────────────────
 * Section 4 — Category breakdown (horizontal bar chart)
 * ──────────────────────────────────────────────────────────── */

function CategorySection({ report }: { report: WeeklyReportData }) {
  return (
    <motion.section
      id="categories"
      variants={{
        hidden: { opacity: 0, y: 16, filter: 'blur(6px)' },
        show: { opacity: 1, y: 0, filter: 'blur(0px)' },
      }}
      transition={{ duration: 0.7, ease: EASE }}
      aria-labelledby="categories-heading"
      className="scroll-mt-32 space-y-5"
    >
      <SectionHeader
        eyebrow="Section 4 · Categories"
        title="Where the gaps are."
        id="categories-heading"
      />
      <CategoryBarChart
        rows={report.categoryBreakdown}
        blindSpotCategory={report.blindSpotCategory}
        formatLabel={categoryLabel}
      />
    </motion.section>
  );
}

/* ────────────────────────────────────────────────────────────
 * Section 5 — Replay
 * ──────────────────────────────────────────────────────────── */

function ReplaySection({
  report,
  onViewClaim,
}: {
  report: WeeklyReportData;
  onViewClaim: (id: string) => void;
}) {
  const reduce = useReducedMotion();
  const replay = report.replayClaim;

  return (
    <motion.section
      id="replay"
      variants={{
        hidden: { opacity: 0, y: 16, filter: 'blur(6px)' },
        show: { opacity: 1, y: 0, filter: 'blur(0px)' },
      }}
      transition={{ duration: 0.7, ease: EASE }}
      aria-labelledby="replay-heading"
      className="scroll-mt-32 space-y-5"
    >
      <SectionHeader
        eyebrow="Section 5 · Replay"
        title="The claim worth a second look."
        id="replay-heading"
      />

      {replay ? (
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE, delay: 0.2 }}
          className="relative overflow-hidden rounded-4xl border-2 border-black bg-card p-5 shadow-hard sm:p-6"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border-2 border-black bg-card px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider">
                {categoryLabel(replay.category)}
              </span>
              <span
                className={[
                  'inline-flex items-center gap-1 rounded-full border-2 border-black px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider',
                  replay.verdict === 'real' ? 'bg-real text-real-foreground' : 'bg-red text-white',
                ].join(' ')}
              >
                Truth: {replay.verdict === 'real' ? 'Real' : 'Fake'}
              </span>
            </div>
            <span className="font-display text-heading-3 font-bold tabular-nums text-foreground/40">
              #1
            </span>
          </div>

          <p className="mt-4 font-display text-heading-3 font-semibold leading-heading-3 tracking-display">
            {replay.text}
          </p>

          {replay.explanation && (
            <p className="mt-3 text-label leading-label text-foreground/75">
              {replay.explanation}
            </p>
          )}

          {replay.sourceUrl && (
            <a
              href={replay.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-label-small font-semibold underline decoration-pink-accent decoration-2 underline-offset-4 hover:text-pink-accent"
            >
              Source
              <ArrowUpRight size={12} aria-hidden="true" />
            </a>
          )}

          <div className="mt-5 flex items-center gap-3 border-t-2 border-black/10 pt-4">
            <motion.button
              type="button"
              onClick={() => onViewClaim(replay.id)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.2, ease: EASE }}
              className="group inline-flex items-center gap-2 rounded-lg border-2 border-black bg-accent px-4 py-2 text-label font-semibold text-accent-foreground shadow-hard transition-[box-shadow,translate] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-x-0 active:translate-y-0"
            >
              <Eye size={14} aria-hidden="true" />
              <span>Open this claim</span>
              <span className="grid size-6 place-items-center rounded-full border-2 border-black bg-black/10 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:scale-110">
                <ArrowUpRight size={11} strokeWidth={2.5} aria-hidden="true" />
              </span>
            </motion.button>
            <span className="text-label-small text-foreground/60">
              See the full explanation and vote it again.
            </span>
          </div>
        </motion.div>
      ) : (
        <div className="rounded-4xl border-2 border-black bg-card p-6 text-center text-label text-foreground/70 shadow-hard-sm">
          No replay in this range — you didn&apos;t miss anything worth a
          closer look.
        </div>
      )}
    </motion.section>
  );
}

/* ────────────────────────────────────────────────────────────
 * Section header (reusable)
 * ──────────────────────────────────────────────────────────── */

function SectionHeader({
  eyebrow,
  title,
  id,
  tone = 'light',
}: {
  eyebrow: string;
  title: string;
  id: string;
  tone?: 'light' | 'dark';
}) {
  const reduce = useReducedMotion();
  return (
    <motion.header
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="flex items-end justify-between gap-3"
    >
      <div>
        <p
          className={[
            'inline-flex items-center gap-1.5 text-label-small font-semibold uppercase tracking-wider',
            tone === 'dark' ? 'text-white/60' : 'text-foreground/60',
          ].join(' ')}
        >
          <Target size={12} aria-hidden="true" />
          {eyebrow}
        </p>
        <h2
          id={id}
          className={[
            'mt-1 font-display text-heading-1 font-bold leading-heading-1 tracking-display',
            tone === 'dark' ? 'text-white' : 'text-foreground',
          ].join(' ')}
        >
          {title}
        </h2>
      </div>
    </motion.header>
  );
}

/* ────────────────────────────────────────────────────────────
 * Footer — regenerate button + link back to feed
 * ──────────────────────────────────────────────────────────── */

function FooterActions({
  isRegenerating,
  onRegenerate,
}: {
  isRegenerating: boolean;
  onRegenerate: () => void;
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 12 },
        show: { opacity: 1, y: 0 },
      }}
      transition={{ duration: 0.6, ease: EASE }}
      className="flex flex-col items-stretch gap-3 border-t-2 border-black/10 pt-6 sm:flex-row sm:items-center sm:justify-between"
    >
      <Link
        to="/claims"
        className="inline-flex items-center gap-1.5 text-label font-semibold text-foreground/70 transition-colors hover:text-foreground"
      >
        <span aria-hidden>←</span>
        Back to the feed
      </Link>

      <motion.button
        type="button"
        onClick={onRegenerate}
        disabled={isRegenerating}
        whileHover={isRegenerating ? undefined : { scale: 1.02 }}
        whileTap={isRegenerating ? undefined : { scale: 0.97 }}
        transition={{ duration: 0.25, ease: EASE }}
        className="group inline-flex items-center gap-2 self-start rounded-full border-2 border-black bg-accent px-5 py-2.5 text-label font-semibold text-accent-foreground shadow-hard transition-[box-shadow,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-x-0 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0 sm:self-auto"
      >
        {isRegenerating ? (
          <Loader2 size={14} className="animate-spin" aria-hidden="true" />
        ) : (
          <RefreshCw size={14} aria-hidden="true" />
        )}
        <span>{isRegenerating ? 'Regenerating…' : 'Regenerate report'}</span>
      </motion.button>
    </motion.div>
  );
}

/* ────────────────────────────────────────────────────────────
 * Empty state
 * ──────────────────────────────────────────────────────────── */

function EmptyState({
  onRegenerate,
  isRegenerating,
  hasVotes,
  range,
}: {
  onRegenerate: () => void;
  isRegenerating: boolean;
  hasVotes: boolean;
  range: Range;
}) {
  const reduce = useReducedMotion();
  const isWeek = range.kind === 'week';

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, ease: EASE }}
      className="relative overflow-hidden rounded-4xl border-2 border-black bg-card p-10 text-center shadow-hard sm:p-14"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-pink-accent/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 -left-16 size-64 rounded-full bg-yellow/30 blur-3xl"
      />

      <motion.div
        animate={reduce ? undefined : { y: [0, -6, 0], rotate: [0, 4, -4, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        className="relative mx-auto grid size-16 place-items-center rounded-2xl border-2 border-black bg-yellow shadow-hard"
      >
        <FileBarChart size={30} aria-hidden="true" />
      </motion.div>

      <h2 className="relative mt-6 font-display text-display-medium font-bold leading-[0.95] tracking-display">
        {hasVotes
          ? 'Generate your first report.'
          : isWeek
            ? 'Your first report lands Sunday.'
            : 'No votes in this range.'}
      </h2>
      <p className="relative mx-auto mt-3 max-w-md text-body-large leading-body-large text-foreground/70">
        {hasVotes
          ? 'You have votes in this range — hit the button below to compute your report now.'
          : isWeek
            ? 'We need at least a few votes to spot a pattern. Vote on more claims this week, and we’ll be ready with your personal report.'
            : 'Try a wider range or come back after you’ve voted on more claims.'}
      </p>

      <div className="relative mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
        {isWeek && (
          <motion.button
            type="button"
            onClick={onRegenerate}
            disabled={isRegenerating}
            whileHover={isRegenerating ? undefined : { scale: 1.03 }}
            whileTap={isRegenerating ? undefined : { scale: 0.97 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="group inline-flex items-center gap-2 rounded-full border-2 border-black bg-accent px-5 py-2.5 text-label font-semibold text-accent-foreground shadow-hard transition-[box-shadow,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-x-0 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0"
          >
            {isRegenerating ? (
              <Loader2 size={14} className="animate-spin" aria-hidden="true" />
            ) : (
              <RefreshCw size={14} aria-hidden="true" />
            )}
            <span>{isRegenerating ? 'Generating…' : 'Generate report now'}</span>
            {!isRegenerating && (
              <span
                aria-hidden
                className="grid size-7 place-items-center rounded-full border-2 border-black bg-black/10 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:rotate-90 group-hover:scale-110"
              >
                <RefreshCw size={12} strokeWidth={2.5} aria-hidden="true" />
              </span>
            )}
          </motion.button>
        )}
        <Link
          to="/claims"
          className="group relative inline-flex items-center gap-2 rounded-full border-2 border-black bg-card px-5 py-2.5 text-label font-semibold text-foreground shadow-hard-sm transition-[box-shadow,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard"
        >
          <span>Vote on claims</span>
          <span
            aria-hidden
            className="grid size-7 place-items-center rounded-full border-2 border-black bg-black/10 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:scale-110"
          >
            <ArrowUpRight size={14} strokeWidth={2.5} aria-hidden="true" />
          </span>
        </Link>
      </div>
    </motion.div>
  );
}

/* ────────────────────────────────────────────────────────────
 * Skeleton
 * ──────────────────────────────────────────────────────────── */

function ReportSkeleton() {
  return (
    <div className="space-y-6">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="overflow-hidden rounded-4xl border-2 border-black bg-card p-6 shadow-hard-sm sm:p-8"
        >
          <div className="h-4 w-40 animate-pulse rounded bg-muted" />
          <div className="mt-3 h-7 w-3/4 animate-pulse rounded bg-muted" />
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="h-40 animate-pulse rounded bg-muted" />
            <div className="h-40 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}
