/**
 * LeaderboardPreview — shown on landing page for logged-out users.
 * Teaches the leaderboard feature with a mini preview of top ranks.
 *
 * Visual upgrade:
 *  - Two stacked glass cards on the right
 *  - Animated rank counts
 *  - Per-row hover lift
 *  - Staggered reveals on scroll
 */
import { Link } from 'react-router-dom';
import { Trophy, Flame, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/auth/UserAvatar';

const EASE = [0.32, 0.72, 0, 1] as const;

const previewData = [
  { rank: 1, name: 'Priya S.', points: 4820, streak: '12 days' },
  { rank: 2, name: 'Marco R.', points: 4350, streak: '8 days' },
  { rank: 3, name: 'Aisha P.', points: 3980, streak: '6 days' },
];

export function LeaderboardPreview() {
  return (
    <section
      id="leaderboard"
      aria-labelledby="leaderboard-h"
      className="relative overflow-hidden border-b-2 border-black bg-yellow"
    >
      {/* Decorative orb */}
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 left-1/4 h-130 w-130 rounded-full opacity-50"
        style={{
          background:
            'radial-gradient(circle at center, rgba(255,144,232,0.45) 0%, rgba(255,144,232,0) 60%)',
        }}
      />

      <div className="relative mx-auto max-w-7xl px-6 py-16 md:py-20">
        <div className="flex flex-col gap-10 items-start md:flex-row">
          {/* Left: content + mini preview */}
          <motion.div
            className="flex-1"
            initial={{ opacity: 0, y: 24, filter: 'blur(8px)' }}
            whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.9, ease: EASE }}
          >
            <div className="flex flex-col gap-3 md:max-w-3xl">
              <p className="text-label-small font-semibold uppercase tracking-[0.08em] text-foreground">
                Compete with others
              </p>
              <h2
                id="leaderboard-h"
                className="font-display text-display-large text-foreground"
                style={{ minWidth: 0, overflowWrap: 'anywhere' }}
              >
                Climb the leaderboard.
              </h2>
              <p className="text-body-large text-foreground/80">
                Earn points for every correct guess. Join the daily and all-time leaderboards.
                Badges, streaks, and your name at the top.
              </p>
            </div>

            {/* Mini preview — Double-Bezel */}
            <motion.div
              className="mt-8 max-w-md rounded-4xl border-2 border-black bg-black/5 p-1.5 shadow-hard"
              whileHover={{ y: -4 }}
              transition={{ duration: 0.5, ease: EASE }}
            >
              <div className="rounded-[1.625rem] border-2 border-black bg-card p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Trophy size={18} className="text-pink-accent" />
                  <span className="text-label font-semibold">Top players today</span>
                </div>
                <motion.div
                  className="space-y-3"
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, amount: 0.4 }}
                  variants={{
                    hidden: {},
                    show: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
                  }}
                >
                  {previewData.map((entry) => (
                    <motion.div
                      key={entry.rank}
                      variants={{
                        hidden: { opacity: 0, x: -10 },
                        show: { opacity: 1, x: 0 },
                      }}
                      transition={{ duration: 0.6, ease: EASE }}
                      className="flex items-center gap-3 rounded-lg px-1 py-1 transition-colors duration-300 hover:bg-yellow/30"
                    >
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-yellow border-2 border-black text-label-small font-bold">
                        {entry.rank}
                      </span>
                      <span className="flex-1 text-label truncate">{entry.name}</span>
                      <span className="flex items-center gap-1 text-label-small text-muted-foreground shrink-0">
                        <Flame size={10} /> {entry.streak}
                      </span>
                      <span className="text-label font-semibold shrink-0">
                        {entry.points.toLocaleString()}
                      </span>
                    </motion.div>
                  ))}
                </motion.div>
                <div className="mt-4 pt-4 border-t-2 border-black">
                  <p className="text-label-small text-muted-foreground text-center">
                    Sign in to join the competition →
                  </p>
                </div>
              </div>
            </motion.div>

            {/* CTA — magnetic */}
            <div className="mt-6">
              <Button
                asChild
                className="group h-14 rounded-full border-2 border-black bg-dark-panel px-7 text-label font-semibold text-white shadow-hard transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:-translate-x-0.5 hover:shadow-[8px_8px_0_0_#000] active:translate-x-0 active:translate-y-0 active:shadow-hard"
              >
                <Link to="/signup" className="inline-flex items-center gap-3">
                  Start voting — it&apos;s free
                  <span
                    aria-hidden
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-pink-accent text-black transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:-translate-y-px group-hover:scale-110"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
                      <path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </Link>
              </Button>
            </div>
          </motion.div>

          {/* Right: Recent Activity Feed */}
          <motion.div
            className="hidden flex-1 max-w-xs md:flex"
            initial={{ opacity: 0, y: 24, rotate: 2 }}
            whileInView={{ opacity: 1, y: 0, rotate: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.9, ease: EASE, delay: 0.15 }}
          >
            <div className="w-full rounded-4xl border-2 border-black bg-black/5 p-1.5 shadow-hard">
              <div className="rounded-[1.625rem] border-2 border-black bg-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Clock size={18} className="text-accent" />
                  <h3 className="font-display text-heading-3 font-semibold">Recent Activity</h3>
                </div>
                <motion.div
                  className="space-y-3"
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, amount: 0.3 }}
                  variants={{
                    hidden: {},
                    show: { transition: { staggerChildren: 0.08, delayChildren: 0.3 } },
                  }}
                >
                  {[
                    { user: 'Priya S.', action: 'voted on', target: 'Climate Claim', correct: true, time: '2m ago' },
                    { user: 'Marco R.', action: 'voted on', target: 'Tech News', correct: false, time: '5m ago' },
                    { user: 'Aisha P.', action: 'voted on', target: 'Health Tip', correct: true, time: '8m ago' },
                    { user: 'James C.', action: 'earned badge', target: '5 Day Streak', correct: null, time: '12m ago' },
                  ].map((activity, i) => (
                    <motion.div
                      key={i}
                      variants={{
                        hidden: { opacity: 0, y: 8 },
                        show: { opacity: 1, y: 0 },
                      }}
                      transition={{ duration: 0.6, ease: EASE }}
                      className="flex items-start gap-3 text-label-small"
                    >
                      <UserAvatar
                        src={null}
                        name={activity.user}
                        size={24}
                        className="border border-black shrink-0"
                        fallbackClassName="bg-muted text-foreground text-[10px]"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="leading-tight">
                          <span className="font-semibold">{activity.user}</span>{' '}
                          {activity.action}{' '}
                          <span className="font-medium">{activity.target}</span>
                        </p>
                        <p className="text-muted-foreground text-[10px]">{activity.time}</p>
                      </div>
                      {activity.correct !== null && (
                        <span
                          className={[
                            'size-5 rounded-full flex items-center justify-center border text-[10px]',
                            activity.correct
                              ? 'bg-real/20 border-real text-real'
                              : 'bg-fake/20 border-fake text-fake',
                          ].join(' ')}
                        >
                          {activity.correct ? '✓' : '✕'}
                        </span>
                      )}
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}