/**
 * Blind Spot — the differentiator.
 * Shows a sample weekly report card (pre-seeded demo account content).
 *
 * Visual upgrade:
 *  - Animated counter for accuracy %
 *  - Filled progress bar grows on enter
 *  - Floating glass "Replay" + "Share" chips with hover lift
 *  - Editorial split (left copy / right report card)
 */
import { motion, useReducedMotion, useMotionValue, useTransform, animate } from 'motion/react';
import { useEffect } from 'react';

const EASE = [0.32, 0.72, 0, 1] as const;

function CountUp({ to, suffix = '' }: { to: number; suffix?: string }) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => `${Math.round(v)}${suffix}`);

  useEffect(() => {
    if (reduce) {
      mv.set(to);
      return;
    }
    const controls = animate(mv, to, { duration: 1.4, ease: EASE, delay: 0.4 });
    return controls.stop;
  }, [mv, to, reduce]);

  return <motion.span>{rounded}</motion.span>;
}

export function BlindSpot() {
  return (
    <section
      id="blind-spot"
      aria-labelledby="blind-spot-h"
      className="relative overflow-hidden border-b-2 border-black bg-background"
    >
      {/* Ambient orb behind the report card */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/3 right-0 h-130 w-130 translate-x-1/3 rounded-full opacity-50"
        style={{
          background:
            'radial-gradient(circle at center, rgba(255,144,232,0.5) 0%, rgba(255,144,232,0) 60%)',
        }}
      />

      <div className="relative mx-auto grid max-w-7xl gap-10 px-6 py-16 md:grid-cols-12 md:gap-12 md:py-24">
        <motion.div
          className="md:col-span-5"
          initial={{ opacity: 0, y: 24, filter: 'blur(8px)' }}
          whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.9, ease: EASE }}
        >
          <p className="text-label-small font-semibold uppercase tracking-[0.08em] text-foreground">
            The pitch
          </p>
          <h2
            id="blind-spot-h"
            className="mt-4 font-display text-display-large text-foreground"
            style={{ minWidth: 0, overflowWrap: 'anywhere' }}
          >
            Your week, written back to you.
          </h2>
          <p className="mt-6 text-body-large text-foreground/80">
            Every Sunday, we generate a one-page report from your votes. It names the category that
            fooled you most, shows you the claim that got you, and gives you a single sentence to
            work on.
          </p>
          <p className="mt-4 text-body-large text-foreground/80">
            No shame. No &ldquo;great job!&rdquo; Just the next thing to watch for.
          </p>
        </motion.div>

        <motion.div
          className="md:col-span-7"
          initial={{ opacity: 0, y: 32, rotate: 1.5, filter: 'blur(10px)' }}
          whileInView={{ opacity: 1, y: 0, rotate: -0.5, filter: 'blur(0px)' }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 1.1, ease: EASE }}
        >
          {/* Report card — Double-Bezel (outer black shell + inner dark panel) */}
          <article
            className="relative rounded-4xl border-2 border-black bg-black/5 p-1.5 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.25)]"
            aria-label="Sample weekly blind-spot report"
          >
            <div className="rounded-[1.625rem] border-2 border-black bg-dark-panel text-white">
              <header className="flex items-center justify-between border-b-2 border-white/20 px-6 py-4">
                <span className="text-label-small font-semibold uppercase tracking-[0.08em] text-white">
                  Your week
                </span>
                <span className="text-label-small text-white/60">Sun · 14:00</span>
              </header>

              <div className="grid gap-6 p-6 md:grid-cols-2">
                <div>
                  <p className="text-label-small uppercase tracking-[0.08em] text-white/60">
                    Accuracy
                  </p>
                  <p className="mt-2 font-display text-display-large text-white">
                    <CountUp to={75} suffix="%" />
                  </p>
                  <p className="mt-1 text-body-small text-white/70">12 of 16 correct</p>

                  {/* Animated accuracy bar */}
                  <div className="mt-4 h-2 w-full overflow-hidden rounded-full border border-white/20 bg-white/5">
                    <motion.div
                      initial={{ width: '0%' }}
                      whileInView={{ width: '75%' }}
                      viewport={{ once: true, amount: 0.5 }}
                      transition={{ duration: 1.6, ease: EASE, delay: 0.5 }}
                      className="h-full rounded-full bg-pink-accent"
                    />
                  </div>
                </div>

                <div>
                  <p className="text-label-small uppercase tracking-[0.08em] text-white/60">
                    Blind spot
                  </p>
                  <p className="mt-2 font-display text-heading-1 text-pink-accent">
                    Manipulated statistics
                  </p>
                  <p className="mt-1 text-body-small text-white/70">4 misses this week</p>
                </div>
              </div>

              <div className="border-t-2 border-white/20 px-6 py-5">
                <p className="text-label-small uppercase tracking-[0.08em] text-white/60">
                  The narrative
                </p>
                <p
                  className="mt-3 font-display text-heading-2 text-white"
                  style={{ minWidth: 0, overflowWrap: 'anywhere' }}
                >
                  You&rsquo;re most often fooled by inflated, suspiciously round numbers &mdash; and
                  you catch misattributed quotes cold.
                </p>
              </div>
            </div>
          </article>

          <motion.div
            className="mt-4 grid gap-3 md:grid-cols-2"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.12, delayChildren: 0.5 } },
            }}
          >
            {[
              {
                swatch: 'bg-yellow',
                text: (
                  <>
                    <span className="font-semibold">Replay that claim →</span> tap to see the source,
                    the debunk, and why it was a manipulated stat.
                  </>
                ),
              },
              {
                swatch: 'bg-pink-accent',
                text: (
                  <>
                    <span className="font-semibold">Share your report →</span> one-tap link to a
                    single-page view of the above.
                  </>
                ),
              },
            ].map((chip, i) => (
              <motion.p
                key={i}
                variants={{
                  hidden: { opacity: 0, y: 12 },
                  show: { opacity: 1, y: 0 },
                }}
                transition={{ duration: 0.7, ease: EASE }}
                className={`cursor-pointer rounded-lg border-2 border-black ${chip.swatch} p-4 text-label-small text-foreground transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:-translate-x-0.5 hover:shadow-hard`}
              >
                {chip.text}
              </motion.p>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}