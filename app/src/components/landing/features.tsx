/**
 * Features — Asymmetrical Bento of TruthLoop's differentiators.
 *
 * Vibe: Editorial Luxury (warm cream, dark ink, hot-pink accent).
 * Layout: Asymmetrical Bento — 12-col grid, one tall hero (8×2),
 * four square tiles, one wide banner. Falls back to a single column
 * below 768px so the visual rhythm doesn't fight touch targets.
 *
 * All cards use the Double-Bezel pattern: an outer `bg-black/5` shell
 * with a hairline ring + 1.5 padding, and an inner `bg-card` core with
 * its own border + inset highlight. The hero card is the loudest —
 * hot-pink "Your pattern" callout + a faux category chart.
 */

import { motion, useReducedMotion } from 'motion/react';
import {
  ArrowUpRight,
  Bell,
  Brain,
  CheckCircle2,
  ListChecks,
  Mail,
  MessageSquare,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Trophy,
} from 'lucide-react';

const EASE = [0.32, 0.72, 0, 1] as const;

/* ── Category data for the hero mini-chart ──────────────────────── */

const BLIND_SPOT_BARS = [
  { label: 'Manipulated stats', pct: 28, hot: true },
  { label: 'Outdated info', pct: 64 },
  { label: 'Misattributed quotes', pct: 78 },
  { label: 'Satire mistaken as real', pct: 86 },
];

/* ── Shared primitives ──────────────────────────────────────────── */

function CardShell({
  children,
  className = '',
  tone = 'default',
}: {
  children: React.ReactNode;
  className?: string;
  tone?: 'default' | 'dark' | 'accent';
}) {
  // Tone controls the OUTER shell background. Using bg-foreground/10
  // (not bg-black/5) so the shell is visible against the off-white
  // section background — bg-black/5 was too subtle and the cards
  // blended in.
  const outerTone =
    tone === 'dark'
      ? 'bg-foreground'
      : tone === 'accent'
        ? 'bg-pink-accent'
        : 'bg-foreground/10';
  return (
    <div
      className={[
        'group relative h-full overflow-hidden rounded-[2rem] border-2 border-black p-1.5',
        'shadow-[0_24px_60px_-20px_rgba(0,0,0,0.4)]',
        'transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]',
        'hover:-translate-y-1 hover:shadow-[0_30px_70px_-20px_rgba(0,0,0,0.5)]',
        outerTone,
        className,
      ].join(' ')}
    >
      <div
        className={[
          'h-full rounded-[1.625rem] border-2 border-black p-6 sm:p-7',
          'shadow-[inset_0_1px_0_rgba(255,255,255,0.55),inset_0_-1px_0_rgba(0,0,0,0.05)]',
          tone === 'dark' ? 'bg-dark-panel text-white' : 'bg-card text-foreground',
        ].join(' ')}
      >
        {children}
      </div>
    </div>
  );
}

function Eyebrow({ children, tone = 'light' }: { children: React.ReactNode; tone?: 'light' | 'dark' }) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full border-2 border-black px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em]',
        tone === 'dark'
          ? 'bg-white/10 text-white/80'
          : 'bg-background text-foreground/70',
      ].join(' ')}
    >
      {children}
    </span>
  );
}

function ArrowPill({ label, tone = 'light' }: { label: string; tone?: 'light' | 'dark' }) {
  // Button-in-Button trailing icon: arrow lives in its own bordered
  // circle, flush with the right edge of the main pill.
  return (
    <span
      className={[
        'group/cta inline-flex items-center gap-2 rounded-full border-2 border-black px-4 py-2 text-label-small font-semibold transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]',
        'group-hover:-translate-y-0.5 group-hover:shadow-hard',
        tone === 'dark'
          ? 'bg-white/10 text-white hover:bg-white/20'
          : 'bg-card text-foreground hover:bg-foreground hover:text-background',
      ].join(' ')}
    >
      {label}
      <span
        aria-hidden
        className={[
          'grid size-6 place-items-center rounded-full border-2 border-black transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]',
          tone === 'dark' ? 'bg-black/30' : 'bg-foreground/10 group-hover/cta:bg-background/20',
          'group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:scale-110',
        ].join(' ')}
      >
        <ArrowUpRight size={11} strokeWidth={2.5} aria-hidden />
      </span>
    </span>
  );
}

/* ── Feature: Hero — Personal blind spot ────────────────────────── */

function BlindSpotHeroCard() {
  const reduce = useReducedMotion();
  return (
    <CardShell tone="default">
      <div className="flex h-full flex-col">
        <div className="flex items-start justify-between gap-4">
          <Eyebrow>
            <Sparkles size={10} aria-hidden />
            The differentiator
          </Eyebrow>
          <span
            aria-hidden
            className="hidden size-10 items-center justify-center rounded-2xl border-2 border-black bg-pink-accent text-foreground shadow-hard-sm sm:flex"
          >
            <Brain size={18} strokeWidth={1.8} />
          </span>
        </div>

        <h3
          className="mt-5 font-display text-display-medium font-bold leading-[0.95] tracking-display sm:text-display-large"
          style={{ minWidth: 0, overflowWrap: 'anywhere' }}
        >
          Your personal
          <br />
          <span className="relative inline-block">
            blind spot
            <span
              aria-hidden
              className="absolute inset-x-0 -bottom-1 h-2 bg-pink-accent"
            />
          </span>
          .
        </h3>

        <p
          className="mt-4 max-w-xl text-body-large leading-body-large text-foreground/75"
          style={{ overflowWrap: 'anywhere' }}
        >
          TruthLoop doesn&rsquo;t ship generic media-literacy advice. After
          your first week of voting, our AI pinpoints the{' '}
          <em className="font-semibold not-italic">specific</em> category of
          misinformation that fools you &mdash; manipulated stats, misquoted
          experts, satire taken as news &mdash; and writes a one-line note
          you can actually use.
        </p>

        {/* Faux category chart */}
        <div
          aria-hidden
          className="mt-6 rounded-2xl border-2 border-black bg-background p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]"
        >
          <div className="mb-4 flex items-center justify-between">
            <p className="text-label-small font-semibold uppercase tracking-[0.12em] text-foreground/60">
              Your accuracy by category
            </p>
            <p className="text-label-small font-semibold text-foreground/60">
              Last 7 days
            </p>
          </div>
          <ul className="space-y-3">
            {BLIND_SPOT_BARS.map((bar, i) => (
              <li key={bar.label} className="flex items-center gap-3">
                <span className="w-32 shrink-0 text-label-small font-semibold text-foreground/80 sm:w-40">
                  {bar.label}
                </span>
                <div className="relative h-2.5 flex-1 overflow-hidden rounded-full border-2 border-black bg-muted">
                  <motion.span
                    initial={reduce ? { width: `${bar.pct}%` } : { width: 0 }}
                    whileInView={{ width: `${bar.pct}%` }}
                    viewport={{ once: true, amount: 0.4 }}
                    transition={{ duration: 1.1, ease: EASE, delay: 0.1 + i * 0.08 }}
                    className={[
                      'absolute inset-y-0 left-0 rounded-full',
                      bar.hot ? 'bg-pink-accent' : 'bg-foreground/30',
                    ].join(' ')}
                  />
                </div>
                <span
                  className={[
                    'w-10 shrink-0 text-right text-label-small font-bold tabular-nums',
                    bar.hot ? 'text-foreground' : 'text-foreground/60',
                  ].join(' ')}
                >
                  {bar.pct}%
                </span>
              </li>
            ))}
          </ul>
          <p
            className="mt-4 inline-flex items-center gap-2 rounded-full border-2 border-black bg-pink-accent px-3 py-1.5 text-label-small font-semibold text-foreground shadow-hard-sm"
          >
            <span aria-hidden>↘</span>
            Pattern: manipulated statistics &mdash; your lowest accuracy
          </p>
        </div>

        <div className="mt-auto pt-6">
          <ArrowPill label="See how it works" />
        </div>
      </div>
    </CardShell>
  );
}

/* ── Feature tile: Daily Scam Forecast ──────────────────────────── */

function ForecastCard() {
  const items = [
    { sev: 'High', title: 'AI voice-cloning family-emergency scams', tint: 'bg-red text-white' },
    { sev: 'Med', title: 'Crypto &ldquo;airdrop&rdquo; phishing wave', tint: 'bg-orange text-black' },
    { sev: 'Low', title: 'Misleading election turnout infographics', tint: 'bg-yellow text-black' },
  ];
  return (
    <CardShell>
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between">
          <Eyebrow>
            <ShieldAlert size={10} aria-hidden /> Daily
          </Eyebrow>
          <span
            aria-hidden
            className="grid size-9 place-items-center rounded-xl border-2 border-black bg-yellow text-foreground shadow-hard-sm"
          >
            <TrendingUp size={15} strokeWidth={1.8} />
          </span>
        </div>
        <h3 className="mt-4 font-display text-heading-1 font-bold leading-tight tracking-display">
          Daily Scam Forecast.
        </h3>
        <p className="mt-2 text-label leading-label text-foreground/70">
          AI-curated threats, ranked by severity, every morning at 8am.
        </p>
        <ul className="mt-5 space-y-2">
          {items.map((it) => (
            <li
              key={it.title}
              className="flex items-center gap-2.5 rounded-xl border-2 border-black/15 bg-background px-3 py-2"
            >
              <span
                className={[
                  'inline-flex shrink-0 items-center rounded-md border-2 border-black px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider',
                  it.tint,
                ].join(' ')}
              >
                {it.sev}
              </span>
              <span
                className="text-label-small text-foreground/85"
                dangerouslySetInnerHTML={{ __html: it.title }}
              />
            </li>
          ))}
        </ul>
        <div className="mt-auto pt-5">
          <ArrowPill label="Today&rsquo;s forecast" />
        </div>
      </div>
    </CardShell>
  );
}

/* ── Feature tile: Live AI Fact-Check ───────────────────────────── */

function FactCheckCard() {
  return (
    <CardShell>
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between">
          <Eyebrow>
            <Sparkles size={10} aria-hidden /> Live
          </Eyebrow>
          <span
            aria-hidden
            className="grid size-9 place-items-center rounded-xl border-2 border-black bg-pink-accent text-foreground shadow-hard-sm"
          >
            <CheckCircle2 size={15} strokeWidth={1.8} />
          </span>
        </div>
        <h3 className="mt-4 font-display text-heading-1 font-bold leading-tight tracking-display">
          AI fact-checks your submit.
        </h3>
        <p className="mt-2 text-label leading-label text-foreground/70">
          Drop a claim. Get a verdict, a source, and a 2-line reason in
          under 30 seconds.
        </p>

        {/* Faux search input */}
        <div
          aria-hidden
          className="mt-5 rounded-2xl border-2 border-black bg-background p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-foreground/50">
            Submit a claim
          </p>
          <p className="mt-1.5 text-label leading-label text-foreground/80">
            &ldquo;A new study says coffee cuts dementia risk by 70%&rdquo;
          </p>
          <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border-2 border-black bg-card px-3 py-2">
            <span className="inline-flex items-center gap-1.5 text-label-small font-semibold text-foreground/70">
              <span className="grid size-5 place-items-center rounded-full border-2 border-black bg-pink-accent">
                <Sparkles size={9} aria-hidden />
              </span>
              Verifying&hellip;
            </span>
            <span className="rounded-md border-2 border-black bg-real px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-real-foreground">
              Mostly True
            </span>
          </div>
        </div>

        <div className="mt-auto pt-5">
          <ArrowPill label="Try fact-check" />
        </div>
      </div>
    </CardShell>
  );
}

/* ── Feature tile: Instant Alerts ───────────────────────────────── */

function AlertsCard() {
  return (
    <CardShell>
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between">
          <Eyebrow>
            <Bell size={10} aria-hidden /> Alerts
          </Eyebrow>
          <span
            aria-hidden
            className="grid size-9 place-items-center rounded-xl border-2 border-black bg-red text-white shadow-hard-sm"
          >
            <Mail size={15} strokeWidth={1.8} />
          </span>
        </div>
        <h3 className="mt-4 font-display text-heading-1 font-bold leading-tight tracking-display">
          High-risk hits your inbox.
        </h3>
        <p className="mt-2 text-label leading-label text-foreground/70">
          The moment a high-severity scam pattern lands, we email you. Low
          and medium never interrupt.
        </p>

        {/* Faux email preview */}
        <div
          aria-hidden
          className="mt-5 rounded-2xl border-2 border-black bg-card p-3 shadow-hard-sm"
        >
          <div className="flex items-start gap-2">
            <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full border-2 border-black bg-red text-white">
              <Bell size={12} strokeWidth={2} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-label-small font-semibold text-foreground">
                ⚠️ High-risk scam pattern
              </p>
              <p className="truncate text-label-small text-foreground/60">
                AI voice-cloning family-emergency&hellip;
              </p>
              <p className="mt-1 text-[10px] uppercase tracking-wider text-foreground/50">
                just now · TruthLoop
              </p>
            </div>
          </div>
        </div>

        <div className="mt-auto pt-5">
          <ArrowPill label="Manage alerts" />
        </div>
      </div>
    </CardShell>
  );
}

/* ── Feature tile: AI Coacher Notes ─────────────────────────────── */

function CoacherCard() {
  return (
    <CardShell>
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between">
          <Eyebrow>
            <Brain size={10} aria-hidden /> Coach
          </Eyebrow>
          <span
            aria-hidden
            className="grid size-9 place-items-center rounded-xl border-2 border-black bg-foreground text-background shadow-hard-sm"
          >
            <MessageSquare size={15} strokeWidth={1.8} />
          </span>
        </div>
        <h3 className="mt-4 font-display text-heading-1 font-bold leading-tight tracking-display">
          A coach that knows you.
        </h3>
        <p className="mt-2 text-label leading-label text-foreground/70">
          Every section of the weekly report opens with a personalized
          note &mdash; written for you, not for the average user.
        </p>

        {/* Faux coacher note */}
        <div
          aria-hidden
          className="mt-5 rounded-2xl border-l-4 border-pink-accent bg-background px-4 py-3"
        >
          <p className="text-label leading-label text-foreground/85">
            &ldquo;You missed{' '}
            <em className="not-italic font-semibold">outdated info</em>{' '}
            twice this week. Most of the time it&rsquo;s a real story with
            an old timestamp &mdash; next time, check the published date
            before you vote.&rdquo;
          </p>
          <p className="mt-2 text-[10px] uppercase tracking-wider text-foreground/50">
            Trend note · this week
          </p>
        </div>

        <div className="mt-auto pt-5">
          <ArrowPill label="Read a sample" />
        </div>
      </div>
    </CardShell>
  );
}

/* ── Feature tile: Toxicity moderation ──────────────────────────── */

function ModerationCard() {
  return (
    <CardShell>
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between">
          <Eyebrow>
            <MessageSquare size={10} aria-hidden /> Community
          </Eyebrow>
          <span
            aria-hidden
            className="grid size-9 place-items-center rounded-xl border-2 border-black bg-real text-real-foreground shadow-hard-sm"
          >
            <CheckCircle2 size={15} strokeWidth={1.8} />
          </span>
        </div>
        <h3 className="mt-4 font-display text-heading-1 font-bold leading-tight tracking-display">
          Cleaner threads.
        </h3>
        <p className="mt-2 text-label leading-label text-foreground/70">
          AI toxicity filter keeps every discussion on-topic, on-tone,
          on-mission. You debate. We moderate.
        </p>

        {/* Faux thread with moderation */}
        <div aria-hidden className="mt-5 space-y-2">
          <div className="rounded-xl border-2 border-black/15 bg-background px-3 py-2">
            <p className="text-label-small text-foreground/85">
              The source URL is dated 2019 &mdash; definitely outdated
              info, not a real claim.
            </p>
            <p className="mt-1 text-[10px] uppercase tracking-wider text-foreground/50">
              @fact-checker · 2m
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border-2 border-red/40 bg-red/5 px-3 py-2">
            <span className="rounded-md border-2 border-red bg-red px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
              Filtered
            </span>
            <span className="line-through text-label-small text-foreground/40">
              you&rsquo;re an idiot if you believe this
            </span>
          </div>
        </div>

        <div className="mt-auto pt-5">
          <ArrowPill label="Read the policy" />
        </div>
      </div>
    </CardShell>
  );
}

/* ── Feature banner: Gamification ───────────────────────────────── */

function GamificationCard() {
  const badges = [
    { label: 'First Vote', tone: 'bg-yellow text-foreground' },
    { label: 'Streak x7', tone: 'bg-pink-accent text-foreground' },
    { label: 'Category Master', tone: 'bg-real text-real-foreground' },
    { label: 'Diver', tone: 'bg-orange text-foreground' },
    { label: 'Skeptic', tone: 'bg-dark-panel text-white' },
    { label: 'Top 10', tone: 'bg-card text-foreground' },
  ];
  return (
    <CardShell tone="accent">
      <div className="grid items-center gap-6 md:grid-cols-[1.1fr_1.5fr]">
        <div>
          <Eyebrow>
            <ListChecks size={10} aria-hidden /> Streaks · Badges · Bragging rights
          </Eyebrow>
          <h3 className="mt-4 font-display text-heading-1 font-bold leading-tight tracking-display sm:text-display-medium">
            Points, badges, streaks &mdash; and the leaderboard to prove it.
          </h3>
          <p className="mt-3 max-w-md text-label leading-label text-foreground/85">
            Every correct guess is a coin. Every streak is a badge. Climb
            the daily board, the all-time board, and earn your way onto a
            wall of <em className="not-italic font-semibold">Category Master</em>.
          </p>
          <div className="mt-5">
            <ArrowPill label="See all 8 badges" />
          </div>
        </div>
        <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-6">
          {badges.map((b) => (
            <li
              key={b.label}
              className="flex flex-col items-center gap-1.5"
            >
              <span
                aria-hidden
                className={[
                  'grid aspect-square w-full place-items-center rounded-2xl border-2 border-black text-[9px] font-bold uppercase tracking-wider shadow-hard-sm',
                  b.tone,
                ].join(' ')}
              >
                <Trophy size={16} strokeWidth={1.5} />
              </span>
              <span className="text-center text-[10px] font-semibold leading-tight text-foreground/80">
                {b.label}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </CardShell>
  );
}

/* ── Section ────────────────────────────────────────────────────── */

export function Features() {
  const reduce = useReducedMotion();
  return (
    <section
      id="features"
      aria-labelledby="features-h"
      className="relative overflow-hidden border-b-2 border-black bg-background"
    >
      {/* Section ambient orb — fixed, pointer-events-none, GPU-friendly */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 top-32 h-130 w-130 rounded-full opacity-30"
        style={{
          background:
            'radial-gradient(circle at center, rgba(255,144,232,0.55) 0%, rgba(255,144,232,0) 60%)',
        }}
      />

      <div className="relative mx-auto max-w-7xl px-6 py-20 md:py-32">
        <motion.header
          className="flex flex-col gap-3 md:max-w-3xl"
          initial={reduce ? false : { opacity: 0, y: 24, filter: 'blur(8px)' }}
          whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.9, ease: EASE }}
        >
          <p className="text-label-small font-semibold uppercase tracking-[0.08em] text-foreground/70">
            What you get
          </p>
          <h2
            id="features-h"
            className="font-display text-display-large font-bold leading-[0.95] tracking-display"
            style={{ minWidth: 0, overflowWrap: 'anywhere' }}
          >
            Seven things no other
            <br />
            <span className="relative inline-block">
              media-literacy app
              <span
                aria-hidden
                className="absolute inset-x-0 -bottom-1 h-2 bg-pink-accent"
              />
            </span>{' '}
            does.
          </h2>
          <p className="mt-2 max-w-2xl text-body-large leading-body-large text-foreground/75">
            The core loop you&rsquo;d expect. Plus five AI features that turn
            voting into a habit, and a blind-spot report that turns the
            habit into{' '}
            <em className="not-italic font-semibold">self-knowledge</em>.
          </p>
        </motion.header>

        <div
          className="mt-12 grid auto-rows-min grid-cols-1 gap-5 md:grid-cols-12 md:gap-6"
        >
          <FeatureCell className="md:col-span-8 md:row-span-2">
            <BlindSpotHeroCard />
          </FeatureCell>
          <FeatureCell className="md:col-span-4">
            <ForecastCard />
          </FeatureCell>
          <FeatureCell className="md:col-span-4">
            <FactCheckCard />
          </FeatureCell>
          <FeatureCell className="md:col-span-4">
            <AlertsCard />
          </FeatureCell>
          <FeatureCell className="md:col-span-4">
            <CoacherCard />
          </FeatureCell>
          <FeatureCell className="md:col-span-4">
            <ModerationCard />
          </FeatureCell>
          <FeatureCell className="md:col-span-12">
            <GamificationCard />
          </FeatureCell>
        </div>
      </div>
    </section>
  );
}

/** Wraps each card with a per-card entrance animation + hover lift.
 *
 *  Per-card `whileInView` (not a parent cascade) because the grid
 *  layout is irregular — a parent-driven stagger would fire on the
 *  whole grid as one block, but the HERO is 2× the height of the
 *  tiles, so the lower tiles would appear before the HERO finished
 *  entering. Per-card triggers keep the cascade natural.
 *
 *  `amount: 0.05` means just 5% of the card needs to be visible —
 *  the previous 0.15 was too strict for the 800px-tall HERO.
 *
 *  Spans (`md:col-span-X`, `md:row-span-X`) are applied HERE because
 *  FeatureCell is the DIRECT child of the CSS grid — span classes
 *  on the inner CardShell would be ignored. */
function FeatureCell({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={['h-full', className].join(' ')}
      initial={reduce ? false : { opacity: 0, y: 28, filter: 'blur(10px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, amount: 0.05 }}
      transition={{ duration: 0.9, ease: EASE }}
      whileHover={reduce ? undefined : { y: -4 }}
    >
      {children}
    </motion.div>
  );
}

export default Features;
