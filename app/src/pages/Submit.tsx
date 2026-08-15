/**
 * Submit — /submit tab. Live AI fact-check on a user-pasted claim.
 *
 * Spec reference: `.ai/02-business-logic.md` §2.5 + `.ai/05-ai-prompts.md` §2.
 *
 * Flow:
 *   1. User pastes a headline / paragraph / link snippet (max 1000 chars).
 *   2. POST /api/submissions → server calls claude-opus-4-1 (STRONG_MODEL),
 *      persists the row, awards +5 points (capped at 20/day), returns the
 *      full FactCheck object.
 *   3. We render the result card with verdict chip + confidence bar +
 *      headline + bulleted reasons + clickable sources.
 *   4. The "Recent submissions" list below updates optimistically.
 *
 * UX:
 *   - Character counter under the textarea (1000 max).
 *   - Submit button disabled when empty, over-limit, or in-flight.
 *   - Loading state shows an elapsed-time counter (so the user knows it's
 *     still working — opus-4-1 calls can take 2–5s on first call).
 *   - Result card auto-scrolls into view after submit.
 *   - Sources open in a new tab with rel=noopener.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  ExternalLink,
  Clock,
  Quote,
  ChevronDown,
  CalendarDays,
  X,
} from 'lucide-react';
import { AppNav } from '@/components/AppNav';
import { EASE } from '@/lib/motion';
import {
  applySubmissionToCache,
  getMySubmissions,
  submissionKeys,
  submitClaim,
  type FactCheck,
  type Submission,
} from '@/actions/submissions';
import { BadgeUnlockedModal } from '@/components/feed/BadgeUnlockedModal';
import type { ProfileBadge } from '@/actions/profile';

const MAX_CHARS = 1000;

/* ── Severity styling ── */

const VERDICT_META: Record<
  FactCheck['verdict'],
  {
    label: string;
    chipBg: string;
    chipFg: string;
    icon: typeof CheckCircle2;
    ring: string;
    /** Tint for the outer-shell background and the left column rule. */
    shellBg: string;
    stripe: string;
  }
> = {
  real: {
    label: 'Real',
    chipBg: 'bg-real',
    chipFg: 'text-white',
    icon: CheckCircle2,
    ring: 'ring-real',
    shellBg: 'bg-real-light/40',
    stripe: 'bg-real',
  },
  fake: {
    label: 'Likely fake',
    chipBg: 'bg-danger',
    chipFg: 'text-danger-foreground',
    icon: AlertTriangle,
    ring: 'ring-danger',
    shellBg: 'bg-fake-light/40',
    stripe: 'bg-danger',
  },
  unverified: {
    label: "Can't verify",
    chipBg: 'bg-warning',
    chipFg: 'text-warning-foreground',
    icon: HelpCircle,
    ring: 'ring-warning',
    shellBg: 'bg-yellow/40',
    stripe: 'bg-warning',
  },
};

/* ── Helpers ── */

function shortTimeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, Math.floor((now - then) / 1000));
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

/** YYYY-MM-DD (UTC) — used for client-side day-bucketing of submissions. */
function dateKeyUtc(iso: string): string {
  return iso.slice(0, 10);
}

/** Today / Yesterday / Custom filter modes. */
type FilterMode = 'all' | 'today' | 'yesterday' | 'custom';

function confidenceLabel(c: number): string {
  if (c >= 80) return 'High confidence';
  if (c >= 60) return 'Medium confidence';
  if (c >= 30) return 'Low confidence';
  return 'Very low confidence';
}

/* ── Page ── */

export function Submit() {
  const [text, setText] = useState('');
  const [elapsedMs, setElapsedMs] = useState(0);
  const startedAtRef = useRef<number>(0);
  const resultRef = useRef<HTMLDivElement | null>(null);

  // Recent-submissions filter (client-side — createdAt is already in the payload)
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [customDate, setCustomDate] = useState<string>(''); // YYYY-MM-DD
  const [unlockedBadges, setUnlockedBadges] = useState<ProfileBadge[]>([]);

  // Recent submissions — pre-populated so the page never feels empty on cold load.
  const mineQuery = useQuery({
    queryKey: submissionKeys.mine(20),
    queryFn: () => getMySubmissions(20),
    staleTime: 30_000,
  });

  // Filtered view — recomputes whenever the filter or upstream data changes.
  const filteredSubmissions = useMemo(() => {
    const all = mineQuery.data ?? [];
    if (filterMode === 'all' || all.length === 0) return all;

    const todayUtc = new Date();
    const todayKey = todayUtc.toISOString().slice(0, 10);
    const yesterday = new Date(todayUtc);
    yesterday.setUTCDate(todayUtc.getUTCDate() - 1);
    const yesterdayKey = yesterday.toISOString().slice(0, 10);

    return all.filter((s) => {
      const key = dateKeyUtc(s.createdAt);
      if (filterMode === 'today') return key === todayKey;
      if (filterMode === 'yesterday') return key === yesterdayKey;
      if (filterMode === 'custom') return customDate ? key === customDate : true;
      return true;
    });
  }, [mineQuery.data, filterMode, customDate]);

  const isFiltered = filterMode !== 'all';
  const totalCount = mineQuery.data?.length ?? 0;

  const submitMutation = useMutation({
    mutationFn: submitClaim,
    onSuccess: (res) => {
      applySubmissionToCache(res.submission);
      setText('');
      setElapsedMs(0);
      // Fire the badge ceremony if the server returned newly-earned badges.
      if (res.newlyEarnedBadges && res.newlyEarnedBadges.length > 0) {
        setUnlockedBadges(res.newlyEarnedBadges);
      }
    },
  });

  // Elapsed-time ticker while the mutation is in flight.
  // No setState in the effect body itself — the timer is the only writer.
  useEffect(() => {
    if (!submitMutation.isPending) return;
    startedAtRef.current = Date.now();
    const interval = setInterval(() => {
      setElapsedMs(Date.now() - startedAtRef.current);
    }, 100);
    return () => clearInterval(interval);
  }, [submitMutation.isPending]);

  // Auto-scroll to the result card once we have one.
  useEffect(() => {
    if (submitMutation.data && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [submitMutation.data]);

  const trimmed = text.trim();
  const overLimit = text.length > MAX_CHARS;
  const canSubmit = trimmed.length > 0 && !overLimit && !submitMutation.isPending;

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
              'radial-gradient(circle at center, rgba(255,144,232,0.45) 0%, rgba(255,144,232,0) 60%)',
          }}
        />
        <div className="relative mx-auto max-w-[1600px] px-6 py-16 md:py-20">
          <motion.div
            className="flex flex-col gap-3 md:max-w-3xl"
            initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.9, ease: EASE }}
          >
            <p className="flex items-center gap-2 text-label-small font-semibold uppercase tracking-[0.08em]">
              <Sparkles size={14} aria-hidden="true" />
              Live AI fact-check
            </p>
            <h1
              className="font-display text-display-large leading-[0.95]"
              style={{ minWidth: 0, overflowWrap: 'anywhere' }}
            >
              Paste a claim. Get a verdict.
            </h1>
            <p className="mt-2 text-body-large text-foreground/80">
              Claude reads it, weighs the evidence, and gives you a confidence-rated
              answer in under 5 seconds. Submissions never enter the main feed —
              they live in your private &ldquo;My submissions&rdquo; list below.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Composer ── */}
      <section className="border-b-2 border-black bg-background">
        <div className="mx-auto max-w-3xl px-6 py-10">
          <label htmlFor="claim-text" className="sr-only">
            Claim to fact-check
          </label>
          <textarea
            id="claim-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste a headline, a paragraph, or a link snippet. Up to 1000 characters."
            rows={6}
            disabled={submitMutation.isPending}
            className={[
              'w-full resize-y rounded-lg border-2 border-black bg-card p-4 font-mono text-body shadow-hard',
              'focus-hard placeholder:text-muted-foreground disabled:opacity-60',
              overLimit ? 'ring-2 ring-danger' : '',
            ].join(' ')}
            aria-invalid={overLimit}
            aria-describedby="char-counter submit-status"
          />

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div
              id="char-counter"
              className={[
                'text-label-small font-medium',
                overLimit ? 'text-danger' : 'text-muted-foreground',
              ].join(' ')}
              aria-live="polite"
            >
              {text.length} / {MAX_CHARS}
            </div>

            <div className="flex items-center gap-3">
              {submitMutation.isPending && (
                <span
                  className="inline-flex items-center gap-1.5 text-label-small text-muted-foreground"
                  aria-live="polite"
                >
                  <Clock size={12} aria-hidden="true" />
                  {(elapsedMs / 1000).toFixed(1)}s
                </span>
              )}
              <button
                type="button"
                onClick={() => submitMutation.mutate({ text: trimmed })}
                disabled={!canSubmit}
                className="inline-flex items-center gap-2 rounded-lg border-2 border-black bg-accent px-5 py-2.5 text-label font-semibold text-accent-foreground shadow-hard hover-lift disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitMutation.isPending ? (
                  <>
                    <motion.span
                      aria-hidden
                      className="inline-block h-2 w-2 rounded-full bg-current"
                      animate={{ scale: [1, 1.4, 1], opacity: [1, 0.4, 1] }}
                      transition={{ duration: 1.2, repeat: Infinity }}
                    />
                    Fact-checking…
                  </>
                ) : (
                  <>
                    <Sparkles size={14} aria-hidden="true" />
                    Fact-check it
                  </>
                )}
              </button>
            </div>
          </div>

          {submitMutation.isError && (
            <p
              id="submit-status"
              role="alert"
              className="mt-3 inline-flex items-center gap-2 text-label-small font-medium text-danger"
            >
              <AlertTriangle size={12} aria-hidden="true" />
              {submitMutation.error instanceof Error
                ? submitMutation.error.message
                : 'Something went wrong. Try again.'}
            </p>
          )}
        </div>
      </section>

      {/* ── Result + recent submissions ── */}
      <main className="mx-auto max-w-3xl px-6 py-10">
        <div ref={resultRef} />
        <AnimatePresence mode="wait">
          {submitMutation.data && (
            <ResultCard
              key={submitMutation.data.submission.id}
              factCheck={submitMutation.data.factCheck}
              pointsAwarded={submitMutation.data.pointsAwarded}
            />
          )}
        </AnimatePresence>

        <section className="mt-16">
          <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-col gap-2">
              <p className="flex items-center gap-2 text-label-small font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-foreground" />
                Private to you
              </p>
              <h2 className="font-display text-display-small leading-[0.95]">
                My recent submissions
              </h2>
            </div>
            {mineQuery.data && (
              <span className="inline-flex items-center gap-2 rounded-pill border-2 border-black bg-card px-3 py-1 text-label-small font-semibold shadow-hard-sm">
                <span className="font-mono">{filteredSubmissions.length}</span>
                <span className="text-muted-foreground">
                  {isFiltered ? `of ${totalCount}` : 'total'}
                </span>
              </span>
            )}
          </header>

          {/* Filter chips + custom-date picker */}
          {totalCount > 0 && (
            <FilterBar
              mode={filterMode}
              onModeChange={(m) => {
                setFilterMode(m);
                if (m !== 'custom') setCustomDate('');
              }}
              customDate={customDate}
              onCustomDateChange={setCustomDate}
            />
          )}

          {mineQuery.isPending ? (
            <RecentSkeleton />
          ) : mineQuery.isError ? (
            <p className="text-label-small text-danger">Couldn't load your submissions.</p>
          ) : totalCount === 0 ? (
            <EmptyRecent />
          ) : filteredSubmissions.length === 0 ? (
            <FilteredEmpty
              mode={filterMode}
              customDate={customDate}
              onReset={() => {
                setFilterMode('all');
                setCustomDate('');
              }}
            />
          ) : (
            <motion.ul
              className="flex flex-col gap-5"
              initial="hidden"
              animate="show"
              variants={{
                hidden: {},
                show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
              }}
            >
              {filteredSubmissions.map((s) => (
                <RecentRow key={s.id} submission={s} />
              ))}
            </motion.ul>
          )}
        </section>

        {/* ── Badge-unlocked ceremony (fires after a successful submit) ── */}
        <BadgeUnlockedModal
          badges={unlockedBadges}
          onClose={() => setUnlockedBadges([])}
        />
      </main>
    </div>
  );
}

/* ── Subcomponents ── */

function ResultCard({
  factCheck,
  pointsAwarded,
}: {
  factCheck: FactCheck;
  pointsAwarded: number;
}) {
  const meta = VERDICT_META[factCheck.verdict];
  const Icon = meta.icon;

  return (
    <motion.article
      initial={{ opacity: 0, y: 28, filter: 'blur(8px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, y: -10, filter: 'blur(8px)' }}
      transition={{ duration: 0.7, ease: EASE }}
      className={`rounded-2xl border-2 border-black bg-card p-6 shadow-hard ${meta.ring} ring-2`}
      aria-live="polite"
    >
      {/* Verdict chip + confidence */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span
          className={[
            'inline-flex items-center gap-2 rounded-pill border-2 border-black px-4 py-1.5 text-label font-semibold uppercase tracking-[0.08em]',
            meta.chipBg,
            meta.chipFg,
          ].join(' ')}
        >
          <Icon size={14} aria-hidden="true" />
          {meta.label}
        </span>

        <div className="flex items-center gap-3 text-label-small">
          <span className="font-mono text-muted-foreground">{confidenceLabel(factCheck.confidence)}</span>
          <span className="font-display text-heading-3 leading-none">{factCheck.confidence}%</span>
        </div>
      </div>

      {/* Confidence bar */}
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full border-2 border-black bg-muted">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${factCheck.confidence}%` }}
          transition={{ duration: 0.7, ease: EASE }}
          className={[
            'h-full',
            factCheck.verdict === 'real' && 'bg-highlight',
            factCheck.verdict === 'fake' && 'bg-danger',
            factCheck.verdict === 'unverified' && 'bg-warning',
          ]
            .filter(Boolean)
            .join(' ')}
        />
      </div>

      {/* Headline */}
      <h2 className="mt-6 font-display text-heading-2">{factCheck.headline}</h2>

      {/* Reasons */}
      {factCheck.reasons.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2">
          {factCheck.reasons.map((r, i) => (
            <li key={i} className="flex gap-3 text-body">
              <span aria-hidden="true" className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-foreground" />
              <span>{r}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Sources */}
      {factCheck.sources && factCheck.sources.length > 0 && (
        <div className="mt-6 rounded-lg border-2 border-black bg-background p-4">
          <h3 className="text-label-small font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Sources cited by the AI
          </h3>
          <ul className="mt-3 flex flex-col gap-2">
            {factCheck.sources.map((src, i) => (
              <li key={i}>
                <a
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-1.5 break-all text-label-small font-medium underline decoration-2 underline-offset-2 hover:text-accent"
                >
                  {src.title}
                  <ExternalLink
                    size={11}
                    aria-hidden="true"
                    className="shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  />
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t-2 border-black pt-4 text-label-small text-muted-foreground">
        <span>
          Category:{' '}
          <span className="font-mono uppercase">{factCheck.category.replace(/_/g, ' ')}</span>
        </span>
        {pointsAwarded > 0 && (
          <motion.span
            initial={{ scale: 1.3, opacity: 0.6 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 12, stiffness: 220 }}
            className="inline-flex items-center gap-1.5 rounded-pill border-2 border-black bg-highlight px-3 py-1 font-semibold text-highlight-foreground"
          >
            +{pointsAwarded} pts
          </motion.span>
        )}
      </footer>
    </motion.article>
  );
}

/**
 * RecentRow — premium magazine-spread card for a single submission.
 *
 * Anatomy (outer → inner):
 *   1. Motion wrapper — fade-up + blur entry, staggered from the parent <ul>.
 *   2. Outer shell — rounded-2xl, tinted verdict background, p-1.5 wrapper.
 *      Hosts the left "column rule" stripe (4px → 6px on hover) and lifts on hover.
 *   3. Inner core — a <button> so the entire row is clickable; expand toggle
 *      lives here. p-5 md:p-6 with the asymmetric grid (claim 2/3 + verdict 1/3).
 *   4. Expandable detail panel — full explanation, numbered source cards,
 *      category + full timestamp. Slides open with a smooth height animation.
 *
 * Layout: asymmetric. Mobile = single column. md+ = claim takes 2/3, verdict
 * stack takes 1/3 on the right.
 */
function RecentRow({ submission }: { submission: Submission }) {
  const [expanded, setExpanded] = useState(false);
  const verdict = submission.aiVerdict ?? 'unverified';
  const meta = VERDICT_META[verdict];
  const Icon = meta.icon;
  const confidence = submission.aiConfidence ?? 0;
  const sources = submission.aiSources ?? [];
  const hasDetail =
    (submission.aiExplanation && submission.aiExplanation.length > 0) ||
    sources.length > 0 ||
    !!submission.aiCategory;

  // First sentence of the explanation becomes the pull-quote — it carries the
  // verdict's reasoning in plain language, which is what the user actually
  // wants to glance at when scanning the list.
  const pullQuote = submission.aiExplanation?.split(/[.!?]/)[0]?.trim();

  return (
    <motion.li
      variants={{
        hidden: { opacity: 0, y: 28, filter: 'blur(10px)' },
        show: {
          opacity: 1,
          y: 0,
          filter: 'blur(0px)',
          transition: { duration: 0.7, ease: EASE },
        },
      }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.5, ease: EASE }}
      className="group relative"
    >
      {/* Outer shell — tinted verdict background acts as the "tray" */}
      <div
        className={[
          'relative rounded-2xl p-1.5',
          'transition-shadow duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]',
          'shadow-hard group-hover:shadow-hard-lg',
          meta.shellBg,
        ].join(' ')}
      >
        {/* Left column rule — the magazine spread "stripe" */}
        <span
          aria-hidden
          className={[
            'absolute top-1.5 bottom-1.5 left-0 w-1 rounded-r-md',
            'transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]',
            meta.stripe,
            'group-hover:w-1.5',
          ].join(' ')}
        />

        {/* Inner core — rounded-2xl outer (1rem) minus p-1.5 (0.375rem) = concentric curve.
            Rendered as a <button> so the whole card is keyboard-accessible. */}
        <button
          type="button"
          onClick={() => hasDetail && setExpanded((v) => !v)}
          disabled={!hasDetail}
          aria-expanded={expanded}
          aria-label={expanded ? 'Collapse details' : 'Expand details'}
          className="relative block w-full rounded-[0.625rem] border-2 border-black bg-card p-5 text-left md:p-6 cursor-pointer disabled:cursor-default focus-visible:outline-3 focus-visible:outline-black"
        >
          <div className="grid gap-5 md:grid-cols-[1fr_auto] md:gap-6">
            {/* ── Left: claim + reason ── */}
            <div className="min-w-0 flex flex-col gap-3">
              {/* Eyebrow: time + category */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                <span className="font-mono">{shortTimeAgo(submission.createdAt)}</span>
                {submission.aiCategory && (
                  <>
                    <span aria-hidden className="inline-block h-1 w-1 rounded-full bg-foreground/40" />
                    <span className="font-mono">
                      {submission.aiCategory.replace(/_/g, ' ')}
                    </span>
                  </>
                )}
              </div>

              {/* The submitted claim — display weight, generous tracking */}
              <p className="font-display text-body-large font-medium leading-[1.25] text-foreground">
                {submission.text}
              </p>

              {/* Pull-quote: first sentence of the explanation, if present */}
              {pullQuote && pullQuote.length > 12 && (
                <figure className="mt-1 flex gap-2 border-l-2 border-foreground/20 pl-3">
                  <Quote
                    size={14}
                    aria-hidden
                    className="mt-0.5 shrink-0 text-foreground/40"
                  />
                  <blockquote className="text-label-small italic leading-snug text-muted-foreground">
                    {pullQuote}.
                  </blockquote>
                </figure>
              )}
            </div>

            {/* ── Right: verdict column (1/3 on md+) ── */}
            <div className="flex shrink-0 flex-col items-stretch gap-3 md:items-end md:text-right">
              {/* Verdict chip */}
              <span
                className={[
                  'inline-flex items-center gap-1.5 self-start rounded-pill border-2 border-black px-3 py-1 text-label-small font-bold uppercase tracking-[0.08em]',
                  meta.chipBg,
                  meta.chipFg,
                ].join(' ')}
              >
                <Icon size={12} aria-hidden="true" />
                {meta.label}
              </span>

              {/* Confidence: large display number + thin kinetic bar */}
              <div className="flex flex-col gap-1.5 md:items-end">
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-heading-2 leading-none">
                    {confidence}
                  </span>
                  <span className="text-label-small font-medium text-muted-foreground">
                    %
                  </span>
                </div>
                <div className="h-1.5 w-32 overflow-hidden rounded-pill border-2 border-black bg-muted md:w-28">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${confidence}%` }}
                    transition={{ duration: 0.9, ease: EASE, delay: 0.2 }}
                    className={[
                      'h-full',
                      verdict === 'real' && 'bg-real',
                      verdict === 'fake' && 'bg-danger',
                      verdict === 'unverified' && 'bg-warning',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Expand/collapse affordance — bottom-right chevron that rotates */}
          {hasDetail && (
            <span
              aria-hidden
              className="pointer-events-none absolute bottom-3 right-3 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground"
            >
              {expanded ? 'Hide' : 'Details'}
              <ChevronDown
                size={12}
                className="transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
                style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
              />
            </span>
          )}
        </button>

        {/* Expandable detail panel — full explanation + sources + meta.
            Sits inside the same outer shell so the double-bezel nesting is
            preserved when expanded. */}
        <AnimatePresence initial={false}>
          {expanded && hasDetail && (
            <motion.div
              key="detail"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.5, ease: EASE }}
              className="overflow-hidden"
            >
              <div className="px-1.5 pb-1.5 pt-0">
                <div className="rounded-[0.625rem] border-2 border-black bg-background p-5 md:p-6">
                  <div className="flex flex-col gap-5">
                    {/* Full explanation */}
                    {submission.aiExplanation && (
                      <div className="flex flex-col gap-2">
                        <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                          What Claude said
                        </h4>
                        <p className="text-body leading-relaxed text-foreground/90">
                          {submission.aiExplanation}
                        </p>
                      </div>
                    )}

                    {/* Sources — numbered cards with hover-lift */}
                    {sources.length > 0 && (
                      <div className="flex flex-col gap-2">
                        <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                          Sources cited ({sources.length})
                        </h4>
                        <ul className="flex flex-col gap-2">
                          {sources.map((src, i) => (
                            <li key={i}>
                              <a
                                href={src.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="group/src inline-flex w-full items-center gap-3 rounded-md border-2 border-black bg-card p-3 shadow-hard-sm transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover-lift"
                              >
                                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                                  {String(i + 1).padStart(2, '0')}
                                </span>
                                <span className="flex-1 min-w-0">
                                  <span className="block truncate text-label-small font-medium text-foreground group-hover/staff:underline">
                                    {src.title}
                                  </span>
                                  <span className="block truncate font-mono text-[11px] text-muted-foreground">
                                    {(() => {
                                      try {
                                        return new URL(src.url).hostname.replace(/^www\./, '');
                                      } catch {
                                        return src.url;
                                      }
                                    })()}
                                  </span>
                                </span>
                                <ExternalLink
                                  size={14}
                                  aria-hidden
                                  className="shrink-0 text-muted-foreground transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover/staff:-translate-y-0.5 group-hover/staff:translate-x-0.5"
                                />
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Metadata strip — category + full timestamp */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t-2 border-foreground/10 pt-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      {submission.aiCategory && (
                        <span className="font-mono">
                          Category · {submission.aiCategory.replace(/_/g, ' ')}
                        </span>
                      )}
                      <span aria-hidden className="inline-block h-1 w-1 rounded-full bg-foreground/40" />
                      <span className="font-mono">
                        {new Date(submission.createdAt).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.li>
  );
}

function RecentSkeleton() {
  return (
    <ul className="flex flex-col gap-5">
      {[0, 1, 2].map((i) => (
        <li
          key={i}
          className="h-36 animate-pulse rounded-2xl border-2 border-black bg-card/60"
        />
      ))}
    </ul>
  );
}

function EmptyRecent() {
  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-dashed border-black bg-card/60 p-10 text-center">
      <span
        aria-hidden
        className="pointer-events-none absolute -top-12 left-1/2 h-32 w-32 -translate-x-1/2 rounded-full bg-accent/30 blur-2xl"
      />
      <Sparkles
        className="mx-auto mb-3 size-8 text-foreground/70"
        aria-hidden="true"
      />
      <h3 className="font-display text-heading-3">Nothing here yet.</h3>
      <p className="mt-2 max-w-sm mx-auto text-body text-muted-foreground">
        Your past submissions will appear here. Try pasting a headline above —
        each one earns points and sharpens your blind-spot report.
      </p>
    </div>
  );
}

/**
 * FilterBar — pill chip row for All / Today / Yesterday / Custom. The Custom
 * chip reveals an inline date picker (animated height + opacity) so the user
 * can pick any day. Matches the Gumroad aesthetic (2px borders, offset shadow,
 * hover-lift) and uses EASE cubic-bezier transitions.
 */
const FILTER_OPTIONS: { id: FilterMode; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'custom', label: 'Custom' },
];

function FilterBar({
  mode,
  onModeChange,
  customDate,
  onCustomDateChange,
}: {
  mode: FilterMode;
  onModeChange: (m: FilterMode) => void;
  customDate: string;
  onCustomDateChange: (d: string) => void;
}) {
  return (
    <div className="mb-6">
      <div
        role="radiogroup"
        aria-label="Filter submissions by date"
        className="flex flex-wrap items-center gap-2"
      >
        {FILTER_OPTIONS.map((opt) => {
          const active = mode === opt.id;
          return (
            <motion.button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onModeChange(opt.id)}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.2, ease: EASE }}
              className={[
                'inline-flex items-center gap-1.5 rounded-pill border-2 border-black px-4 py-1.5 text-label-small font-semibold uppercase tracking-[0.08em]',
                'transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
                active
                  ? 'bg-foreground text-background shadow-hard'
                  : 'bg-card text-foreground shadow-hard-sm hover-lift',
              ].join(' ')}
            >
              {opt.id === 'custom' && <CalendarDays size={12} aria-hidden="true" />}
              {opt.label}
              {opt.id === 'custom' && customDate && (
                <span
                  aria-hidden
                  className="ml-0.5 inline-block h-1.5 w-1.5 rounded-full bg-current"
                />
              )}
            </motion.button>
          );
        })}

        {mode !== 'all' && (
          <motion.button
            type="button"
            onClick={() => {
              onModeChange('all');
              onCustomDateChange('');
            }}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="inline-flex items-center gap-1 rounded-pill border-2 border-black bg-card px-3 py-1.5 text-label-small font-semibold uppercase tracking-[0.08em] text-foreground shadow-hard-sm hover-lift"
            aria-label="Clear filter"
          >
            <X size={12} aria-hidden="true" />
            Clear
          </motion.button>
        )}
      </div>

      {/* Inline date picker — slides open when Custom is selected */}
      <AnimatePresence initial={false}>
        {mode === 'custom' && (
          <motion.div
            key="custom-picker"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border-2 border-black bg-card p-3 shadow-hard-sm">
              <label
                htmlFor="custom-date"
                className="text-label-small font-semibold uppercase tracking-[0.08em] text-muted-foreground"
              >
                Pick a date
              </label>
              <input
                id="custom-date"
                type="date"
                value={customDate}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => onCustomDateChange(e.target.value)}
                className="rounded-md border-2 border-black bg-background px-3 py-1.5 font-mono text-body-medium font-medium shadow-hard-sm focus-hard"
              />
              {customDate && (
                <span className="text-label-small text-muted-foreground">
                  {new Date(`${customDate}T00:00:00Z`).toLocaleDateString(undefined, {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                    timeZone: 'UTC',
                  })}
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * FilteredEmpty — shown when the user has submissions but the current filter
 * yields zero matches. Distinct from EmptyRecent (which is for "no submissions
 * at all"); offers a one-click reset to All.
 */
function FilteredEmpty({
  mode,
  customDate,
  onReset,
}: {
  mode: FilterMode;
  customDate: string;
  onReset: () => void;
}) {
  let body = 'No submissions for this filter.';
  if (mode === 'today') body = "You haven't submitted anything today yet.";
  else if (mode === 'yesterday') body = "Nothing was submitted yesterday.";
  else if (mode === 'custom' && customDate) {
    body = `Nothing was submitted on ${new Date(`${customDate}T00:00:00Z`).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    })}.`;
  } else if (mode === 'custom') {
    body = 'Pick a date above to see what you submitted then.';
  }

  return (
    <div className="rounded-2xl border-2 border-dashed border-black bg-card/60 p-8 text-center">
      <CalendarDays
        className="mx-auto mb-3 size-7 text-foreground/70"
        aria-hidden="true"
      />
      <p className="text-body text-muted-foreground">{body}</p>
      <button
        type="button"
        onClick={onReset}
        className="mt-4 inline-flex items-center gap-1.5 rounded-pill border-2 border-black bg-foreground px-4 py-1.5 text-label-small font-semibold uppercase tracking-[0.08em] text-background shadow-hard-sm hover-lift"
      >
        Show all submissions
      </button>
    </div>
  );
}
