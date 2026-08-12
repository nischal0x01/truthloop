/**
 * Forecast — the daily AI scam forecast.
 * Three severity cards (high / medium / low).
 *
 * Visual upgrade:
 *  - Bento-feel asymmetric layout (first card spans 2 cols on desktop)
 *  - Severity indicator pill with pulsing dot
 *  - Hover lifts + inner glow on the top bar
 */
import { motion } from 'motion/react';

const EASE = [0.32, 0.72, 0, 1] as const;

const items = [
  {
    severity: 'high',
    chip: 'High',
    chipBg: 'bg-black',
    chipFg: 'text-white',
    chipDot: 'bg-pink-accent',
    title: 'Festival-season UPI refund scams',
    body: 'Inbound messages promising a refund for a failed transaction, asking you to &ldquo;verify&rdquo; via a link. Verify any refund request through the original app, never a link.',
    accent: 'from-red/20',
    span: 'md:col-span-2',
  },
  {
    severity: 'medium',
    chip: 'Medium',
    chipBg: 'bg-white',
    chipFg: 'text-foreground',
    chipDot: 'bg-orange',
    title: 'Fake airline refund portals',
    body: 'Look-alike pages that mirror real airline cancellation flows. Always type the airline domain yourself; do not search-and-click.',
    accent: 'from-orange/20',
    span: 'md:col-span-1',
  },
  {
    severity: 'low',
    chip: 'Low',
    chipBg: 'bg-white',
    chipFg: 'text-foreground',
    chipDot: 'bg-black',
    title: 'Job-offer direct messages',
    body: 'Unsolicited LinkedIn or WhatsApp DMs offering remote work. Real recruiters do not ask for bank details before an interview.',
    accent: 'from-yellow/20',
    span: 'md:col-span-1',
  },
];

export function Forecast() {
  return (
    <section
      id="forecast"
      aria-labelledby="forecast-h"
      className="relative overflow-hidden border-b-2 border-black bg-off-white-surface"
    >
      {/* Ambient orb */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/3 h-130 w-130 rounded-full opacity-40"
        style={{
          background:
            'radial-gradient(circle at center, rgba(241,243,51,0.5) 0%, rgba(241,243,51,0) 60%)',
        }}
      />

      <div className="relative mx-auto max-w-7xl px-6 py-16 md:py-24">
        <motion.div
          className="flex flex-col gap-3 md:max-w-3xl"
          initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
          whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.9, ease: EASE }}
        >
          <p className="text-label-small font-semibold uppercase tracking-[0.08em] text-foreground">
            Daily scam forecast
          </p>
          <h2
            id="forecast-h"
            className="font-display text-display-large text-foreground"
            style={{ minWidth: 0, overflowWrap: 'anywhere' }}
          >
            What scammers are doing today.
          </h2>
          <p className="mt-2 text-body-large text-foreground/80">
            Each morning at 06:00 UTC, our AI reads the last 48 hours of headlines and the last week
            of reported scam patterns, and writes three forecasts for the next seven days.
          </p>
        </motion.div>

        <motion.ul
          className="mt-12 grid gap-5 md:grid-cols-3"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
          }}
        >
          {items.map((it) => (
            <motion.li
              key={it.title}
              variants={{
                hidden: { opacity: 0, y: 28, filter: 'blur(10px)' },
                show: { opacity: 1, y: 0, filter: 'blur(0px)' },
              }}
              transition={{ duration: 0.9, ease: EASE }}
              whileHover={{ y: -6 }}
              className={`group relative ${it.span} cursor-pointer rounded-4xl border-2 border-black bg-black/5 p-1.5 shadow-[0_20px_50px_-25px_rgba(0,0,0,0.25)] transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]`}
              style={{ minWidth: 0 }}
            >
              {/* Inner core — Double-Bezel */}
              <div
                className={`flex h-full flex-col gap-3 rounded-[1.625rem] border-2 border-black p-6 ${it.severity === 'high' ? 'bg-red text-white' : it.severity === 'medium' ? 'bg-orange text-black' : 'bg-card text-foreground'} shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex items-center gap-2 rounded-pill border-2 border-black px-3 py-1 text-label-small font-semibold ${it.chipBg} ${it.chipFg}`}
                  >
                    <motion.span
                      aria-hidden
                      className={`inline-block h-2 w-2 rounded-full border-2 border-black ${it.chipDot}`}
                      animate={
                        it.severity === 'high'
                          ? { scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }
                          : undefined
                      }
                      transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    {it.chip}
                  </span>
                  <span className="text-label-small font-mono uppercase tracking-[0.15em] opacity-70">
                    {it.severity}
                  </span>
                </div>

                <h3
                  className="font-display text-heading-2"
                  style={{ minWidth: 0, overflowWrap: 'anywhere' }}
                >
                  {it.title}
                </h3>

                <p
                  className="text-body opacity-90"
                  dangerouslySetInnerHTML={{ __html: it.body }}
                />

                {/* Hover reveal — "Read full brief" */}
                <div className="mt-auto flex items-center gap-2 pt-4 text-label-small font-semibold uppercase tracking-[0.15em] opacity-70 transition-opacity duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:opacity-100">
                  Read full brief
                  <span
                    aria-hidden
                    className="inline-flex h-6 w-6 items-center justify-center rounded-full border-2 border-current transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-1 group-hover:-translate-y-px group-hover:scale-110"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
                      <path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </div>
              </div>
            </motion.li>
          ))}
        </motion.ul>
      </div>
    </section>
  );
}