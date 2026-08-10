/* Hallmark · macrostructure: Split Sign · tone: soft · anchor hue: pink #ff90e8
 * genre: modern-minimal-adjacent · theme: Gumroad system (off-white · hot-pink accent)
 * motion: feature-rotate · row-stagger · input-glow · button-lift
 * component: layout · states: default
 */

/*
 * Split Sign — two-panel auth layout
 * Left (44%): dark brand panel — wordmark + rotating PRODUCT MOCKUP showcase
 * Right: off-white paper — form card, vertically centred
 *
 * The left panel cycles through five miniature mockups of the real product
 * (claim card, blind-spot report, scam forecast, comment thread, leaderboard)
 * rather than icon+paragraph marketing copy — the visitor sees the app before
 * they sign in. Each mockup mirrors the real component's visual language:
 * 2px black border + rounded-lg + shadow-hard, per app/Design.md.
 *
 * Rotation pauses on hover, is jumpable via the tab rail, and collapses to a
 * static fade under prefers-reduced-motion.
 *
 * Mobile: stacked — the mockup is hidden below 768px (it would push the form
 * off-screen); the panel becomes a compact branded header.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  ShieldCheck,
  Vote,
  MessagesSquare,
  Radar,
  BrainCircuit,
  Trophy,
  ArrowUp,
  Flame,
  Check,
  X,
} from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
}

/* ── Motion primitives ─────────────────────────────────────────────── */

const EASE = [0.16, 1, 0.3, 1] as const;

/* Parent variant staggers its children — used by every mockup so rows
   cascade in rather than appearing as one block. */
const stack = {
  hidden: {},
  show: { transition: { staggerChildren: 0.035, delayChildren: 0.04 } },
};

const row = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: EASE } },
};

/* ── Shared mockup chrome ──────────────────────────────────────────── */

/* A miniature app window. `tone` picks white paper vs dark panel so
   consecutive slides don't all read identically. */
function Mock({
  title,
  meta,
  tone = 'paper',
  children,
}: {
  title: string;
  meta: string;
  tone?: 'paper' | 'dark';
  children: React.ReactNode;
}) {
  const dark = tone === 'dark';
  return (
    <motion.div
      variants={stack}
      initial="hidden"
      animate="show"
      className={[
        'w-full overflow-hidden rounded-lg border-2 border-black shadow-hard',
        dark ? 'bg-dark-panel text-white' : 'bg-white text-black',
      ].join(' ')}
    >
      <motion.header
        variants={row}
        className={[
          'flex items-center justify-between gap-3 border-b-2 px-4 py-2.5',
          dark ? 'border-white/20' : 'border-black',
        ].join(' ')}
      >
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em]">{title}</span>
        <span className={dark ? 'text-[11px] text-white/55' : 'text-[11px] text-black/50'}>
          {meta}
        </span>
      </motion.header>
      {children}
    </motion.div>
  );
}

/* ── 1 · Vote: the core loop ───────────────────────────────────────── */

function VoteMock() {
  return (
    <Mock title="Today's claim" meta="2h ago">
      <div className="px-4 py-4">
        <motion.span
          variants={row}
          className="inline-flex items-center gap-1.5 rounded-md border-2 border-black bg-pink-accent px-2 py-0.5 text-[11px] font-medium text-black"
        >
          Health
        </motion.span>

        <motion.p
          variants={row}
          className="mt-3 font-display text-[17px] font-medium leading-snug"
          style={{ overflowWrap: 'anywhere' }}
        >
          &ldquo;Drinking lemon water every morning cures type&nbsp;2 diabetes.&rdquo;
        </motion.p>

        <motion.div variants={row} className="mt-4 grid grid-cols-2 gap-2.5">
          <span className="flex items-center justify-center gap-1.5 rounded-md border-2 border-black bg-white py-2 text-[13px] font-semibold">
            <Check size={14} aria-hidden="true" /> REAL
          </span>
          <span className="flex items-center justify-center gap-1.5 rounded-md border-2 border-black bg-yellow py-2 text-[13px] font-semibold">
            <X size={14} aria-hidden="true" /> FAKE
          </span>
        </motion.div>
      </div>

      <motion.footer
        variants={row}
        className="flex items-center justify-between border-t-2 border-black bg-off-white-surface px-4 py-2 text-[11px] text-black/60"
      >
        <span>1,284 votes</span>
        <span className="flex items-center gap-1">
          <MessagesSquare size={12} aria-hidden="true" /> 96 replies
        </span>
      </motion.footer>
    </Mock>
  );
}

/* ── 2 · Blind spot: the pitch ─────────────────────────────────────── */

const BARS = [
  { label: 'Manipulated stats', pct: 82 },
  { label: 'Deepfake media', pct: 46 },
  { label: 'Misattributed quotes', pct: 14 },
];

function BlindSpotMock() {
  const reduce = useReducedMotion();
  return (
    <Mock title="Your week" meta="Sun · 14:00" tone="dark">
      <div className="grid grid-cols-2 gap-4 px-4 py-4">
        <motion.div variants={row}>
          <p className="text-[11px] uppercase tracking-[0.08em] text-white/55">Accuracy</p>
          <p className="mt-1 font-display text-[34px] font-medium leading-none">75%</p>
        </motion.div>
        <motion.div variants={row}>
          <p className="text-[11px] uppercase tracking-[0.08em] text-white/55">Blind spot</p>
          <p className="mt-1.5 font-display text-[17px] font-medium leading-tight text-pink-accent">
            Manipulated statistics
          </p>
        </motion.div>
      </div>

      {/* Miss-rate bars — the "what fools you" chart */}
      <div className="space-y-2.5 border-t-2 border-white/20 px-4 py-4">
        {BARS.map((bar) => (
          <motion.div key={bar.label} variants={row}>
            <div className="mb-1 flex items-center justify-between text-[11px] text-white/70">
              <span>{bar.label}</span>
              <span>{bar.pct}% missed</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/15">
              <motion.div
                className="h-full rounded-full bg-pink-accent"
                initial={{ width: reduce ? `${bar.pct}%` : 0 }}
                animate={{ width: `${bar.pct}%` }}
                transition={{ duration: reduce ? 0 : 0.45, ease: EASE, delay: 0.1 }}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </Mock>
  );
}

/* ── 3 · Forecast ──────────────────────────────────────────────────── */

function ForecastMock() {
  return (
    <Mock title="Scam forecast" meta="Today">
      <div className="px-4 py-4">
        <motion.div variants={row} className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-md border-2 border-black bg-red px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
            <Flame size={12} aria-hidden="true" /> High
          </span>
          <span className="text-[11px] text-black/55">Expected to spike</span>
        </motion.div>

        <motion.p
          variants={row}
          className="mt-3 font-display text-[17px] font-medium leading-snug"
        >
          Fake parcel-delivery texts with a &ldquo;redelivery fee&rdquo; link.
        </motion.p>

        <motion.div
          variants={row}
          className="mt-3 rounded-md border-2 border-black bg-yellow px-3 py-2 text-[12px] leading-relaxed"
        >
          <span className="font-semibold">Tell:</span> couriers never ask for payment by SMS link.
        </motion.div>
      </div>
    </Mock>
  );
}

/* ── 4 · Discuss: nested thread ────────────────────────────────────── */

const THREAD = [
  { author: 'maya_r', depth: 0, votes: 41, text: 'The source study had 12 participants. Twelve.' },
  { author: 'devkoirala', depth: 1, votes: 18, text: 'And it was funded by the supplement brand.' },
  { author: 'anon_owl', depth: 2, votes: 7, text: 'Linked the retraction notice below.' },
];

function DiscussMock() {
  return (
    <Mock title="Discussion" meta="96 replies">
      <div className="space-y-2 px-4 py-4">
        {THREAD.map((c) => (
          <motion.div
            key={c.author}
            variants={row}
            style={{ marginLeft: c.depth * 16 }}
            className="rounded-md border-2 border-black bg-off-white-surface px-3 py-2"
          >
            <div className="flex items-center gap-2 text-[11px]">
              <span className="flex h-4 w-4 items-center justify-center rounded-full border border-black bg-pink-accent text-[9px] font-bold uppercase text-black">
                {c.author[0]}
              </span>
              <span className="font-semibold">{c.author}</span>
              <span className="ml-auto flex items-center gap-0.5 text-black/55">
                <ArrowUp size={11} aria-hidden="true" />
                {c.votes}
              </span>
            </div>
            <p className="mt-1 text-[12px] leading-relaxed text-black/80">{c.text}</p>
          </motion.div>
        ))}
      </div>
    </Mock>
  );
}

/* ── 5 · Leaderboard ───────────────────────────────────────────────── */

const RANKS = [
  { rank: 1, name: 'factfinder_92', pts: 1840, you: false },
  { rank: 2, name: 'You', pts: 1725, you: true },
  { rank: 3, name: 'sceptic_sam', pts: 1690, you: false },
  { rank: 4, name: 'nabin.k', pts: 1512, you: false },
];

function LeaderboardMock() {
  return (
    <Mock title="Daily leaderboard" meta="Resets 00:00">
      <div className="divide-y-2 divide-black/10">
        {RANKS.map((r) => (
          <motion.div
            key={r.rank}
            variants={row}
            className={[
              'flex items-center gap-3 px-4 py-2.5',
              r.you ? 'bg-yellow' : 'bg-white',
            ].join(' ')}
          >
            <span className="w-4 text-[12px] font-bold tabular-nums text-black/55">{r.rank}</span>
            <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-black bg-pink-accent text-[10px] font-bold uppercase">
              {r.name[0]}
            </span>
            <span className={`text-[13px] ${r.you ? 'font-bold' : 'font-medium'}`}>{r.name}</span>
            {r.rank === 1 && <Trophy size={13} aria-hidden="true" className="text-black/60" />}
            <span className="ml-auto text-[13px] font-semibold tabular-nums">
              {r.pts.toLocaleString()}
            </span>
          </motion.div>
        ))}
      </div>
    </Mock>
  );
}

/* ── Feature registry ──────────────────────────────────────────────── */

const FEATURES = [
  { label: 'Vote', icon: Vote, headline: 'Call it: real or fake?', Mock: VoteMock },
  { label: 'Blind spot', icon: BrainCircuit, headline: 'See what fools you.', Mock: BlindSpotMock },
  { label: 'Forecast', icon: Radar, headline: "Tomorrow's scams, today.", Mock: ForecastMock },
  { label: 'Discuss', icon: MessagesSquare, headline: 'Argue it out, civilly.', Mock: DiscussMock },
  { label: 'Compete', icon: Trophy, headline: 'Climb the daily board.', Mock: LeaderboardMock },
];

const ROTATE_MS = 2800;

/* ── Layout ────────────────────────────────────────────────────────── */

export function AuthLayout({ children }: AuthLayoutProps) {
  const reduceMotion = useReducedMotion();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (reduceMotion || paused) return;
    const id = window.setInterval(
      () => setActive((i) => (i + 1) % FEATURES.length),
      ROTATE_MS
    );
    return () => window.clearInterval(id);
  }, [reduceMotion, paused]);

  const feature = FEATURES[active];
  const ActiveMock = feature.Mock;
  const ActiveIcon = feature.icon;

  return (
    <div className="auth-root">
      {/* ── Left panel: brand + rotating product mockups ── */}
      <aside
        className="auth-brand"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <Link to="/" className="auth-brand__wordmark">
          <ShieldCheck size={26} strokeWidth={2} />
          <span>TruthLoop</span>
        </Link>

        <div className="auth-brand__showcase">
          {/* Headline changes with the slide — one line, so the mockup leads */}
          <div className="auth-showcase__head">
            <AnimatePresence mode="wait" initial={false}>
              <motion.h2
                key={feature.label}
                className="auth-showcase__headline"
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
                transition={{ duration: reduceMotion ? 0.12 : 0.2, ease: EASE }}
              >
                <ActiveIcon size={18} strokeWidth={2.5} aria-hidden="true" />
                {feature.headline}
              </motion.h2>
            </AnimatePresence>
          </div>

          {/* The mockup itself */}
          <div className="auth-showcase__stage" aria-live="polite" aria-atomic="true">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={feature.label}
                className="auth-showcase__slide"
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -14, scale: 0.985 }}
                transition={{ duration: reduceMotion ? 0.12 : 0.26, ease: EASE }}
              >
                <ActiveMock />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Tab rail — click to jump; fill bar tracks the dwell timer */}
          <div className="auth-rail" role="tablist" aria-label="Platform features">
            {FEATURES.map((f, i) => (
              <button
                key={f.label}
                type="button"
                role="tab"
                aria-selected={i === active}
                className={`auth-rail__tab${i === active ? ' is-active' : ''}`}
                onClick={() => setActive(i)}
              >
                <span className="auth-rail__label">{f.label}</span>
                <span className="auth-rail__track">
                  {i === active && (
                    <motion.span
                      className="auth-rail__fill"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{
                        duration: reduceMotion || paused ? 0.2 : ROTATE_MS / 1000,
                        ease: 'linear',
                      }}
                    />
                  )}
                </span>
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* ── Right panel: form ── */}
      <main className="auth-form-panel">
        <div className="auth-form-wrap">{children}</div>
      </main>

      <style>{`
        .auth-root {
          display: flex;
          flex: 1;
          background: #ffffff;
          color: #000000;
          font-family: var(--font-sans, 'Inter', system-ui, sans-serif);
          overflow-x: clip;
          min-height: 620px;
        }

        /* ── Left brand panel ── */
        .auth-brand {
          position: relative;
          display: flex;
          flex-direction: column;
          width: 44%;
          min-width: 380px;
          max-width: 620px;
          padding: 40px 44px;
          background: #242423;
          color: #ffffff;
          overflow: hidden;
        }

        /* Subtle dot grid so the dark panel isn't a flat slab behind the card */
        .auth-brand::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: radial-gradient(rgba(255, 255, 255, 0.07) 1px, transparent 1px);
          background-size: 22px 22px;
          pointer-events: none;
        }

        .auth-brand__wordmark {
          position: relative;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 19px;
          font-weight: 500;
          color: #ffffff;
          text-decoration: none;
          letter-spacing: -0.4px;
        }

        /* Showcase is vertically centred in the leftover space */
        .auth-brand__showcase {
          position: relative;
          display: flex;
          flex: 1;
          flex-direction: column;
          justify-content: center;
          gap: 18px;
          padding: 32px 0 8px;
          max-width: 420px;
        }

        /* Fixed height so the mockup below never shifts as the headline swaps */
        .auth-showcase__head {
          position: relative;
          height: 30px;
        }

        .auth-showcase__headline {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          gap: 9px;
          margin: 0;
          font-size: 19px;
          font-weight: 500;
          letter-spacing: -0.3px;
          line-height: 30px;
          color: #ffffff;
          white-space: nowrap;
        }

        .auth-showcase__headline svg {
          flex: none;
          color: #ff90e8;
        }

        /* Reserve the tallest mockup's height — prevents the rail jumping */
        .auth-showcase__stage {
          position: relative;
          min-height: 274px;
        }

        .auth-showcase__slide {
          position: absolute;
          inset: 0;
        }

        /* ── Tab rail ── */
        .auth-rail {
          display: flex;
          gap: 8px;
          margin-top: 6px;
        }

        .auth-rail__tab {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 7px;
          padding: 0;
          background: none;
          border: none;
          text-align: left;
          cursor: pointer;
          color: #dddddd;
          opacity: 0.5;
          transition: opacity 200ms cubic-bezier(0.16, 1, 0.3, 1);
        }

        .auth-rail__tab:hover,
        .auth-rail__tab.is-active {
          opacity: 1;
        }

        .auth-rail__tab:focus-visible {
          outline: 2px solid #ff90e8;
          outline-offset: 3px;
          border-radius: 2px;
        }

        .auth-rail__label {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .auth-rail__tab.is-active .auth-rail__label {
          color: #ffffff;
        }

        .auth-rail__track {
          display: block;
          height: 2px;
          background: rgba(255, 255, 255, 0.2);
          overflow: hidden;
        }

        .auth-rail__fill {
          display: block;
          height: 100%;
          background: #ff90e8;
          transform-origin: left center;
        }

        /* ── Right form panel ── */
        .auth-form-panel {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px 24px;
        }

        .auth-form-wrap {
          width: 100%;
          max-width: 420px;
        }

        /* ── Tablet: narrower panel, tighter padding ── */
        @media (max-width: 1100px) {
          .auth-brand {
            width: 46%;
            min-width: 340px;
            padding: 32px 32px;
          }
          .auth-showcase__headline {
            font-size: 17px;
            white-space: normal;
          }
        }

        /* ── Mobile: stack; drop the mockup so the form stays above the fold ── */
        @media (max-width: 767px) {
          .auth-root {
            flex-direction: column;
            min-height: 0;
          }

          .auth-brand {
            width: 100%;
            min-width: 0;
            max-width: none;
            padding: 20px 24px 22px;
          }

          .auth-brand__showcase {
            flex: none;
            gap: 12px;
            padding: 16px 0 0;
            max-width: none;
          }

          .auth-showcase__stage,
          .auth-showcase__head {
            display: none;
          }

          /* Rail becomes a plain feature list — still communicates scope */
          .auth-rail {
            flex-wrap: wrap;
            gap: 6px 8px;
            margin-top: 0;
          }

          .auth-rail__tab {
            flex: none;
            opacity: 1;
          }

          .auth-rail__track {
            display: none;
          }

          .auth-rail__label {
            padding: 4px 9px;
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 10rem;
            font-size: 10px;
            color: #ffffff;
          }

          .auth-form-panel {
            padding: 32px 20px 48px;
          }
        }
      `}</style>
    </div>
  );
}
