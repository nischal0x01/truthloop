/**
 * The Loop — three steps of the core product.
 * vote → discuss → earn points.
 *
 * Animation: scroll-triggered fade-up with per-card stagger.
 * Visual upgrade: oversized numerals, hover tilt, button-in-button arrow.
 */
import { motion } from 'motion/react';

const EASE = [0.32, 0.72, 0, 1] as const;

const steps = [
  {
    n: '01',
    kicker: 'Vote',
    title: 'Real or fake, in 30 seconds.',
    body: 'Each day, a fresh set of trending claims lands in your feed. Tap real or fake. Get the verdict, the source, and a 2-line reason.',
    swatch: 'bg-pink-accent',
  },
  {
    n: '02',
    kicker: 'Discuss',
    title: 'Threaded, moderated, on-topic.',
    body: 'Why do you think it&rsquo;s fake? Drop a reply. AI toxicity filter keeps the thread usable. Upvote the moves that actually teach.',
    swatch: 'bg-yellow',
  },
  {
    n: '03',
    kicker: 'Earn',
    title: 'Points and badges you keep.',
    body: 'A correct guess is a coin. A streak is a badge. Daily leaderboard, all-time leaderboard, and a personal blind-spot report on Sunday.',
    swatch: 'bg-orange',
  },
];

export function LoopSteps() {
  return (
    <section id="loop" aria-labelledby="loop-h" className="relative border-b-2 border-black bg-background">
      <div className="mx-auto max-w-7xl px-6 py-16 md:py-24">
        <motion.div
          className="flex flex-col gap-3 md:max-w-3xl"
          initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
          whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.9, ease: EASE }}
        >
          <p className="text-label-small font-semibold uppercase tracking-[0.08em] text-foreground">
            How it works
          </p>
          <h2
            id="loop-h"
            className="font-display text-display-large text-foreground"
            style={{ minWidth: 0, overflowWrap: 'anywhere' }}
          >
            Three moves. Thirty seconds.
          </h2>
        </motion.div>

        <motion.ol
          className="mt-12 grid gap-6 md:grid-cols-3"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.14, delayChildren: 0.1 } },
          }}
        >
          {steps.map((s) => (
            <motion.li
              key={s.n}
              variants={{
                hidden: { opacity: 0, y: 28, filter: 'blur(10px)' },
                show: { opacity: 1, y: 0, filter: 'blur(0px)' },
              }}
              transition={{ duration: 0.9, ease: EASE }}
              whileHover={{ y: -6 }}
              className="group relative flex flex-col gap-4 rounded-4xl border-2 border-black bg-black/5 p-1.5 shadow-[0_20px_50px_-25px_rgba(0,0,0,0.25)] transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
              style={{ minWidth: 0 }}
            >
              {/* Inner core — Double-Bezel */}
              <div className="flex h-full flex-col gap-4 rounded-[1.625rem] border-2 border-black bg-card p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.6),inset_0_-1px_0_rgba(0,0,0,0.06)]">
                <div className="flex items-center justify-between">
                  <span
                    aria-hidden
                    className={`inline-block h-7 w-7 border-2 border-black ${s.swatch}`}
                  />
                  <span className="font-display text-heading-2 text-foreground/30 transition-colors duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:text-foreground">
                    {s.n}
                  </span>
                </div>
                <p className="text-label-small font-semibold uppercase tracking-[0.08em] text-foreground">
                  {s.kicker}
                </p>
                <h3
                  className="font-display text-heading-1 text-foreground"
                  style={{ minWidth: 0, overflowWrap: 'anywhere' }}
                >
                  {s.title}
                </h3>
                <p
                  className="text-body text-foreground/80"
                  dangerouslySetInnerHTML={{ __html: s.body }}
                />
                {/* Bottom CTA hint */}
                <div className="mt-auto flex items-center gap-2 pt-4 text-label-small font-semibold uppercase tracking-[0.15em] text-foreground/60 transition-colors duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:text-foreground">
                  Read more
                  <span
                    aria-hidden
                    className="inline-flex h-6 w-6 items-center justify-center rounded-full border-2 border-black bg-card transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-1 group-hover:-translate-y-px group-hover:scale-110"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
                      <path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </div>
              </div>
            </motion.li>
          ))}
        </motion.ol>
      </div>
    </section>
  );
}