/**
 * Final CTA — sign-in anchor.
 * Hot-pink ground, dark-panel text.
 *
 * Visual upgrade:
 *  - Massive headline with animated underline draw-on
 *  - Floating ambient orbs
 *  - Magnetic CTA with nested arrow icon
 */
import { motion } from 'motion/react';

const EASE = [0.32, 0.72, 0, 1] as const;

export function CTA() {
  return (
    <section
      id="start"
      aria-labelledby="cta-h"
      className="relative overflow-hidden border-b-2 border-black bg-pink-accent"
    >
      {/* Ambient orbs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-24 h-130 w-130 rounded-full opacity-60"
        style={{
          background:
            'radial-gradient(circle at center, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 60%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -right-24 h-130 w-130 rounded-full opacity-50"
        style={{
          background:
            'radial-gradient(circle at center, rgba(255,201,0,0.5) 0%, rgba(255,201,0,0) 60%)',
        }}
      />

      <div className="relative mx-auto max-w-7xl px-6 py-20 md:py-32">
        <div className="grid gap-10 md:grid-cols-12 md:items-end">
          <motion.div
            className="md:col-span-8"
            initial={{ opacity: 0, y: 32, filter: 'blur(10px)' }}
            whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 1.1, ease: EASE }}
          >
            <h2
              id="cta-h"
              className="font-display text-display-large text-foreground"
              style={{ minWidth: 0, overflowWrap: 'anywhere' }}
            >
              Find out what you keep{' '}
              <span className="relative inline-block">
                <span className="relative z-10">falling for.</span>
                <motion.span
                  aria-hidden
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true, amount: 0.5 }}
                  transition={{ duration: 1.4, ease: EASE, delay: 0.4 }}
                  className="absolute bottom-1 left-0 h-3 w-full origin-left bg-dark-panel"
                  style={{ zIndex: -1 }}
                />
              </span>
            </h2>
            <p className="mt-4 max-w-2xl text-body-large text-foreground/80">
              Free, no ads, and your guess history is yours. Sign in with Google and the first claim
              is on the screen in five seconds.
            </p>
          </motion.div>

          <motion.div
            className="md:col-span-4 flex md:justify-end"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.2 }}
          >
            <a
              href="/signup"
              className="group inline-flex h-14 items-center justify-center gap-1 rounded-full border-2 border-black bg-dark-panel pl-7 pr-1 text-label font-semibold text-white shadow-hard transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:-translate-x-0.5 hover:shadow-[8px_8px_0_0_#000] active:translate-x-0 active:translate-y-0 active:shadow-hard focus-hard"
            >
              Sign in with Google
              <span
                aria-hidden
                className="ml-3 inline-flex h-11 w-11 items-center justify-center rounded-full bg-pink-accent text-black transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:-translate-y-px group-hover:scale-110"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
                  <path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
}