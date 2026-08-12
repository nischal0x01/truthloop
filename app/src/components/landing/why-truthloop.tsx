/**
 * Why — editorial short block.
 * Problem statement: generic media-literacy advice vs. your specific blind spot.
 * Single-column on mobile (gate 52). No invented metrics.
 *
 * Animation: scroll-triggered fade-up with per-line blur reveal.
 */
import { motion } from 'motion/react';

const EASE = [0.32, 0.72, 0, 1] as const;

export function WhyTruthLoop() {
  return (
    <section aria-labelledby="why-h" className="relative overflow-hidden border-b-2 border-black bg-yellow">
      {/* Subtle radial glow at top-right for depth */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 right-0 h-130 w-130 rounded-full opacity-40"
        style={{
          background:
            'radial-gradient(circle at center, rgba(255,144,232,0.6) 0%, rgba(255,144,232,0) 60%)',
        }}
      />

      <div className="relative mx-auto grid max-w-7xl gap-8 px-6 py-16 md:grid-cols-12 md:gap-12 md:py-24">
        <motion.div
          className="md:col-span-5"
          initial={{ opacity: 0, y: 24, filter: 'blur(8px)' }}
          whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.9, ease: EASE }}
        >
          <p className="text-label-small font-semibold uppercase tracking-[0.08em] text-foreground">
            The problem
          </p>
          <h2
            id="why-h"
            className="mt-4 font-display text-display-large text-foreground"
            style={{ minWidth: 0, overflowWrap: 'anywhere' }}
          >
            You are fooled by different things than I am.
          </h2>
        </motion.div>

        <motion.div
          className="md:col-span-7 md:pt-8"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.12 } },
          }}
        >
          {[
            <>
              Every media-literacy quiz ends the same way: a generic checklist of &ldquo;watch for
              source, watch for date, watch for tone.&rdquo; Useful once. Useless on the next
              headline.
            </>,
            <>
              TruthLoop does the opposite. We log what{' '}
              <em className="font-semibold not-italic">specifically</em> fooled you this week —
              manipulated statistics, misattributed quotes, satirical stories mistaken for real news —
              and write a one-line note you can actually use.
            </>,
          ].map((node, i) => (
            <motion.p
              key={i}
              variants={{
                hidden: { opacity: 0, y: 18, filter: 'blur(8px)' },
                show: { opacity: 1, y: 0, filter: 'blur(0px)' },
              }}
              transition={{ duration: 0.8, ease: EASE }}
              className={i === 0 ? 'text-body-large text-foreground' : 'mt-4 text-body-large text-foreground'}
            >
              {node}
            </motion.p>
          ))}
        </motion.div>
      </div>
    </section>
  );
}