/**
 * DiscussionHero — editorial header for /discussions.
 *
 * Layout archetype: Editorial Split (Section 3.B of high-end-visual-design).
 * Massive variable-tracked headline left, live-stats card right.
 *
 * Visual layers:
 *   1. Ambient pink + yellow orbs (fixed, pointer-events-none, no scroll repaint)
 *   2. Film-grain overlay via .grain-overlay
 *   3. Eyebrow tag (tracked uppercase) + animated mask-reveal heading
 *   4. Subhead in muted-foreground
 *   5. Live stats card with ringed value tiles + pulse indicator
 *
 * Motion:
 *   - Heading: clip-path mask reveal (y: 110% → 0) with overshoot
 *   - Pink underline draws on after the heading settles (scaleX 0 → 1)
 *   - Stats card: staggered children entrance (rotate -1deg → 0)
 *   - Live pulse: gentle opacity blink on the "live" dot
 */

import { motion, useReducedMotion } from 'motion/react';
import { Flame, MessageCircle, TrendingUp, Users } from 'lucide-react';
import { EASE } from '@/lib/motion';

interface DiscussionHeroProps {
  totalPosts: number;
  totalReplies: number;
  onlineNow: number;
  trendingCategory?: string;
}

export function DiscussionHero({
  totalPosts,
  totalReplies,
  onlineNow,
  trendingCategory = 'Misinformation',
}: DiscussionHeroProps) {
  const reduce = useReducedMotion();

  const stats = [
    {
      icon: <MessageCircle size={14} aria-hidden="true" />,
      label: 'Discussions',
      value: totalPosts,
      tone: 'bg-card text-foreground',
    },
    {
      icon: <Users size={14} aria-hidden="true" />,
      label: 'Replies',
      value: totalReplies,
      tone: 'bg-pink-accent text-accent-foreground',
    },
    {
      icon: <Flame size={14} aria-hidden="true" />,
      label: 'Online',
      value: onlineNow,
      tone: 'bg-yellow text-highlight-foreground',
      live: true,
    },
  ];

  return (
    <section
      aria-labelledby="discussions-hero-heading"
      className="grain-overlay relative isolate overflow-hidden rounded-[2rem] border-2 border-black bg-card shadow-hard"
    >
      {/* Ambient orbs — fixed in this section, pointer-events-none, no scroll repaint */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 size-[28rem] rounded-full bg-pink-accent/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -left-20 size-[24rem] rounded-full bg-yellow/30 blur-3xl"
      />

      <div className="relative grid gap-8 px-6 py-10 sm:px-10 sm:py-14 md:grid-cols-[1.4fr_1fr] md:items-end md:gap-12 md:px-14 md:py-16">
        {/* ── Left: editorial typography ── */}
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
            className="inline-flex items-center gap-2 rounded-full border-2 border-black bg-card px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-foreground"
          >
            <span className="relative grid size-2 place-items-center">
              <span className="absolute inset-0 animate-ping rounded-full bg-pink-accent/70" />
              <span className="relative size-2 rounded-full bg-pink-accent" />
            </span>
            Community Forum
          </motion.span>

          <h1
            id="discussions-hero-heading"
            className="relative mt-4 inline-block font-display text-display-xl font-bold leading-[0.92] tracking-display text-foreground"
          >
            <span className="relative inline-block overflow-hidden align-baseline">
              <motion.span
                className="inline-block"
                variants={{
                  hidden: { y: '110%', opacity: 0 },
                  show: { y: '0%', opacity: 1 },
                }}
                transition={{ duration: 0.9, ease: EASE, delay: 0.1 }}
              >
                Discussions
              </motion.span>
            </span>
            {/* Pink accent bar draws on after the heading settles */}
            <motion.span
              aria-hidden="true"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.8, ease: EASE, delay: 0.75 }}
              style={{ transformOrigin: 'left center' }}
              className="absolute -bottom-2 left-0 h-2 w-32 bg-pink-accent"
            />
          </h1>

          <motion.p
            variants={{
              hidden: { opacity: 0, y: 8 },
              show: { opacity: 1, y: 0 },
            }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.35 }}
            className="mt-6 max-w-xl text-body-large leading-body-large text-foreground/75"
          >
            Where readers debate the claims behind the headlines. Vote on the
            discourse, surface the strongest evidence, and learn where your
            instincts diverge from the crowd.
          </motion.p>

          <motion.div
            variants={{
              hidden: { opacity: 0, y: 6 },
              show: { opacity: 1, y: 0 },
            }}
            transition={{ duration: 0.5, ease: EASE, delay: 0.5 }}
            className="mt-6 inline-flex items-center gap-2 rounded-md border-2 border-black bg-yellow px-3 py-1.5 text-label-small font-semibold"
          >
            <TrendingUp size={13} aria-hidden="true" />
            Trending now · {trendingCategory}
          </motion.div>
        </motion.div>

        {/* ── Right: live stats card ── */}
        <motion.div
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12, rotate: -1 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.4 }}
          className="relative"
        >
          <div className="relative overflow-hidden rounded-2xl border-2 border-black bg-background p-5 shadow-hard-sm">
            <div className="flex items-center justify-between">
              <p className="text-label-small font-bold uppercase tracking-wider text-foreground/70">
                Live pulse
              </p>
              <span className="inline-flex items-center gap-1.5 text-label-small font-semibold text-foreground/70">
                <span className="relative grid size-2 place-items-center">
                  <span className="absolute inset-0 animate-ping rounded-full bg-real/60" />
                  <span className="relative size-2 rounded-full bg-real" />
                </span>
                Live
              </span>
            </div>

            <motion.dl
              initial="hidden"
              animate="show"
              variants={{
                hidden: {},
                show: { transition: { staggerChildren: 0.09, delayChildren: 0.55 } },
              }}
              className="mt-4 grid grid-cols-3 gap-3"
            >
              {stats.map((s) => (
                <motion.div
                  key={s.label}
                  variants={{
                    hidden: { opacity: 0, y: 10 },
                    show: { opacity: 1, y: 0 },
                  }}
                  transition={{ duration: 0.5, ease: EASE }}
                  className={`relative overflow-hidden rounded-xl border-2 border-black p-3 ${s.tone}`}
                >
                  <div className="flex items-center gap-1.5 text-label-small font-semibold">
                    {s.icon}
                    <span className="text-[11px] uppercase tracking-wider">
                      {s.label}
                    </span>
                  </div>
                  <p className="mt-2 font-display text-heading-1 font-bold leading-none tabular-nums">
                    {s.value.toLocaleString()}
                  </p>
                  {s.live && (
                    <motion.span
                      aria-hidden
                      animate={{ opacity: [1, 0.4, 1] }}
                      transition={{ duration: 2.2, repeat: Infinity, ease: EASE }}
                      className="absolute right-2 top-2 size-1.5 rounded-full bg-black"
                    />
                  )}
                </motion.div>
              ))}
            </motion.dl>

            <div className="mt-4 flex items-center justify-between border-t-2 border-black/10 pt-3 text-label-small text-foreground/70">
              <span>Updated moments ago</span>
              <span className="inline-flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-pink-accent" />
                <span className="size-1.5 rounded-full bg-yellow" />
                <span className="size-1.5 rounded-full bg-real" />
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}