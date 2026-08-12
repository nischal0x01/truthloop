/**
 * Hero — typographic with key product stats + cinematic entrance.
 *
 * Animation choreography:
 *   - Mesh gradient orbs drift slowly (decorative)
 *   - Eyebrow, headline words, sub, CTAs, stats, trust strip all enter
 *     with a staggered fade-up + blur (spring-physics curve).
 *   - CTAs use "button-in-button" trailing arrow that translates + scales on hover.
 *   - Floating glass claim-card mockup on the right previews the product.
 */
import { motion, useReducedMotion } from 'motion/react';

const EASE = [0.32, 0.72, 0, 1] as const;

/** Per-word fade-up reveal — gives the headline a kinetic typography feel. */
function WordReveal({
  text,
  delay = 0,
  className,
}: {
  text: string;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const words = text.split(' ');
  return (
    <span className={className} aria-label={text}>
      {words.map((w, i) => (
        <motion.span
          key={`${w}-${i}`}
          aria-hidden
          initial={reduce ? false : { y: '110%', opacity: 0 }}
          animate={{ y: '0%', opacity: 1 }}
          transition={{ duration: 0.9, ease: EASE, delay: delay + i * 0.06 }}
          className="inline-block"
          style={{ marginRight: i === words.length - 1 ? 0 : '0.25em' }}
        >
          {w}
        </motion.span>
      ))}
    </span>
  );
}

export function Hero() {
  return (
    <section
      id="top"
      className="relative isolate overflow-x-clip border-b-2 border-black bg-background"
    >
      {/* Decorative ambient mesh-gradient orbs (decorative; pointer-events: none) */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.6, ease: EASE }}
          className="absolute -top-32 -left-24 h-130 w-130 rounded-full"
          style={{
            background:
              'radial-gradient(circle at center, rgba(255,144,232,0.55) 0%, rgba(255,144,232,0) 65%)',
          }}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.6, ease: EASE, delay: 0.2 }}
          className="absolute top-40 -right-32 h-150 w-150 rounded-full"
          style={{
            background:
              'radial-gradient(circle at center, rgba(241,243,51,0.45) 0%, rgba(241,243,51,0) 65%)',
          }}
        />
      </div>

      <div className="mx-auto grid max-w-7xl gap-10 px-6 pb-20 pt-12 md:grid-cols-12 md:gap-12 md:pb-28 md:pt-20">
        {/* Left: copy column */}
        <div className="md:col-span-7">
          {/* Eyebrow — pill-shaped badge with shimmer dot */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE }}
            className="inline-flex items-center gap-2 rounded-pill border-2 border-black bg-card px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-foreground shadow-hard-sm"
          >
            <motion.span
              aria-hidden
              className="inline-block h-2 w-2 rounded-full bg-pink-accent"
              animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            />
            UNESCO MIL Hackathon · 2026
          </motion.div>

          {/* Headline */}
          <h1
            className="mt-6 font-display text-display-hero text-foreground"
            style={{ minWidth: 0, overflowWrap: 'anywhere' }}
          >
            <WordReveal text="Vote the news." />
            <br />
            <span className="relative inline-block overflow-hidden align-baseline">
              <span className="absolute inset-0 -z-10 translate-x-1 translate-y-1 bg-pink-accent border-2 border-black shadow-hard-sm" />
              <WordReveal
                text="Find your blind spot."
                delay={0.35}
                className="relative inline-block px-2"
              />
            </span>
          </h1>

          {/* Sub */}
          <motion.p
            initial={{ opacity: 0, y: 16, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.7 }}
            className="mt-6 max-w-xl text-body-large text-foreground/80"
          >
            TruthLoop turns the day&rsquo;s trending claims into a 30-second vote. We log what fooled
            you, then write a personal weekly report on the exact type of misinformation you keep
            falling for.
          </motion.p>

          {/* CTAs — magnetic, button-in-button */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE, delay: 0.85 }}
            className="mt-8 flex flex-wrap items-center gap-4"
          >
            <a
              href="/signup"
              className="group inline-flex h-14 items-center justify-center gap-1 rounded-full border-2 border-black bg-pink-accent pl-7 pr-1 text-label font-semibold text-black shadow-hard transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:-translate-x-0.5 hover:shadow-[8px_8px_0_0_#000] active:translate-x-0 active:translate-y-0 active:shadow-hard focus-hard"
            >
              Start voting — it&apos;s free
              <span
                aria-hidden
                className="ml-3 inline-flex h-11 w-11 items-center justify-center rounded-full bg-black text-pink-accent transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:-translate-y-px group-hover:scale-110"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                  <path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </a>
            <a
              href="#blind-spot"
              className="group inline-flex h-14 items-center justify-center rounded-full border-2 border-black bg-dark-panel px-7 text-label font-semibold text-white shadow-hard transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:-translate-x-0.5 hover:shadow-[8px_8px_0_0_#000] active:translate-x-0 active:translate-y-0 active:shadow-hard focus-hard"
            >
              See a sample report
            </a>
          </motion.div>

          {/* Key stats — staggered reveal */}
          <motion.div
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.08, delayChildren: 1.05 } },
            }}
            className="mt-10 flex flex-wrap gap-3"
          >
            {[
              { color: 'bg-yellow', icon: 'check' },
              { color: 'bg-pink-accent', icon: 'cube' },
              { color: 'bg-orange', icon: 'people' },
            ].map((s, i) => (
              <motion.div
                key={i}
                variants={{
                  hidden: { opacity: 0, y: 14, filter: 'blur(8px)' },
                  show: { opacity: 1, y: 0, filter: 'blur(0px)' },
                }}
                transition={{ duration: 0.7, ease: EASE }}
                className="flex items-center gap-2"
              >
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-lg border-2 border-black ${s.color}`}
                >
                  {s.icon === 'check' && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="12" cy="12" r="10" />
                    </svg>
                  )}
                  {s.icon === 'cube' && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                      <path d="M12 2L2 7l10 5 10-5-10-5z" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                  {s.icon === 'people' && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                      <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <span className="text-label text-foreground">
                  {['Hand-verified claims', 'AI scam forecasts daily', 'Points & leaderboards'][i]}
                </span>
              </motion.div>
            ))}
          </motion.div>

          {/* Trust strip */}
          <motion.ul
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, ease: EASE, delay: 1.35 }}
            className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-label-small text-foreground/70"
          >
            <li className="flex items-center gap-2">
              <span aria-hidden className="inline-block h-2 w-2 bg-red border-2 border-black" />
              Pre-verified by hand
            </li>
            <li className="flex items-center gap-2">
              <span aria-hidden className="inline-block h-2 w-2 bg-yellow border-2 border-black" />
              AI moderation on every comment
            </li>
            <li className="flex items-center gap-2">
              <span aria-hidden className="inline-block h-2 w-2 bg-orange border-2 border-black" />
              No tracking, no ads
            </li>
          </motion.ul>
        </div>

        {/* Right: floating claim-card mockup (Z-axis cascade lite) */}
        <motion.div
          initial={{ opacity: 0, y: 32, rotate: 4, filter: 'blur(12px)' }}
          animate={{ opacity: 1, y: 0, rotate: -1.5, filter: 'blur(0px)' }}
          transition={{ duration: 1.1, ease: EASE, delay: 0.5 }}
          className="relative hidden md:col-span-5 md:block"
        >
          <div className="relative mx-auto w-full max-w-md pt-6">
            {/* Secondary ghost card (back layer) */}
            <motion.div
              aria-hidden
              initial={{ opacity: 0, y: 24, rotate: 6 }}
              animate={{ opacity: 0.55, y: 0, rotate: 4 }}
              transition={{ duration: 1.1, ease: EASE, delay: 0.7 }}
              className="absolute inset-x-8 top-2 -z-10 h-70 rounded-2xl border-2 border-black bg-yellow shadow-hard"
            />
            {/* Primary claim card — Double-Bezel (outer shell + inner core) */}
            <div className="rounded-4xl border-2 border-black bg-black/5 p-1.5 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.18)]">
              <article className="rounded-[1.625rem] border-2 border-black bg-card">
                <header className="flex items-center justify-between border-b-2 border-black px-5 py-4">
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-red border-2 border-black" />
                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-foreground">
                      Claim · Trending
                    </span>
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-foreground/60">
                    03 / 12
                  </span>
                </header>

                <div className="p-6">
                  <p className="font-display text-heading-3 text-foreground">
                    &ldquo;A new study found that 87% of brain cells regenerate overnight when you sleep past midnight.&rdquo;
                  </p>

                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      className="group/btn flex h-14 items-center justify-center gap-2 rounded-xl border-2 border-black bg-real text-white text-label font-semibold shadow-hard-sm transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1 hover:shadow-hard active:translate-y-0 active:shadow-hard-sm"
                    >
                      Real
                      <span aria-hidden className="font-bold">✓</span>
                    </button>
                    <button
                      type="button"
                      className="group/btn flex h-14 items-center justify-center gap-2 rounded-xl border-2 border-black bg-fake text-white text-label font-semibold shadow-hard-sm transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1 hover:shadow-hard active:translate-y-0 active:shadow-hard-sm"
                    >
                      Fake
                      <span aria-hidden className="font-bold">✕</span>
                    </button>
                  </div>

                  <div className="mt-5 flex items-center justify-between rounded-xl border-2 border-black bg-yellow/40 px-3 py-2 text-[11px] font-medium">
                    <span className="uppercase tracking-[0.2em] text-foreground/80">Verdict</span>
                    <span className="font-semibold text-fake">Manipulated stat · 96% voted fake</span>
                  </div>
                </div>
              </article>
            </div>

            {/* Floating chip — AI insight */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.9, ease: EASE, delay: 1.1 }}
              className="absolute -bottom-6 -left-4 flex items-center gap-2 rounded-full border-2 border-black bg-dark-panel px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-white shadow-hard"
            >
              <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-pink-accent animate-pulse" />
              AI forecast · live
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}