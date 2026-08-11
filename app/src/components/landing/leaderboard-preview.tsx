/**
 * LeaderboardPreview — shown on landing page for logged-out users.
 * Teaches the leaderboard feature with a mini preview of top ranks.
 * No auth required.
 */
import { Link } from 'react-router-dom';
import { Trophy, Flame, Medal } from 'lucide-react';
import { Button } from '@/components/ui/button';

/* ── Dummy preview data ── */
const previewData = [
  { rank: 1, name: 'Priya S.', points: 4820, streak: '12 days' },
  { rank: 2, name: 'Marco R.', points: 4350, streak: '8 days' },
  { rank: 3, name: 'Aisha P.', points: 3980, streak: '6 days' },
];

/* Podium display order: 2nd, 1st, 3rd — classic podium arrangement */
const PODIUM_ORDER = [1, 0, 2];
const MAX_PODIUM_HEIGHT = 200; // px, tallest bar (rank 1)
const MIN_PODIUM_HEIGHT = 90; // px, floor so short bars stay legible

const maxPoints = Math.max(...previewData.map((d) => d.points));

function podiumHeight(points) {
  const ratio = points / maxPoints;
  return Math.round(MIN_PODIUM_HEIGHT + ratio * (MAX_PODIUM_HEIGHT - MIN_PODIUM_HEIGHT));
}

const rankStyles = {
  1: { bar: 'bg-yellow', dot: 'bg-yellow', width: 'w-24' },
  2: { bar: 'bg-accent/20', dot: 'bg-accent', width: 'w-20' },
  3: { bar: 'bg-accent/10', dot: 'bg-accent/50', width: 'w-20' },
};

export function LeaderboardPreview() {
  return (
    <section
      id="leaderboard"
      aria-labelledby="leaderboard-h"
      className="border-b-2 border-black bg-yellow"
    >
      <div className="mx-auto max-w-7xl px-6 py-10 md:py-12">
        {/* Two-column layout */}
        <div className="flex flex-col md:flex-row gap-10 items-start">
          {/* Left: Content + mini preview */}
          <div className="flex-1">
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

            {/* Mini preview */}
            <div className="mt-8 max-w-md">
              <div className="rounded-lg border-2 border-black bg-card p-5 shadow-hard">
                <div className="mb-4 flex items-center gap-2">
                  <Trophy size={18} className="text-pink-accent" />
                  <span className="text-label font-semibold">Top players today</span>
                </div>
                <div className="space-y-3">
                  {previewData.map((entry) => (
                    <div key={entry.rank} className="flex items-center gap-3">
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
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t-2 border-black">
                  <p className="text-label-small text-muted-foreground text-center">
                    Sign in to join the competition →
                  </p>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="mt-6">
              <Button
                asChild
                className="bg-dark-panel text-white border-2 border-black rounded-lg shadow-hard hover-lift"
              >
                <Link to="/signup">Start voting — it&apos;s free</Link>
              </Button>
            </div>
          </div>

          {/* Right: Podium visual, heights proportional to points */}
          <div
            className="hidden md:flex flex-1 items-end justify-center gap-4"
            style={{ minHeight: MAX_PODIUM_HEIGHT + 56 }}
          >
            {PODIUM_ORDER.map((i) => {
              const entry = previewData[i];
              const styles = rankStyles[entry.rank];
              const height = podiumHeight(entry.points);
              return (
                <div key={entry.rank} className="flex flex-col items-center gap-2">
                  <div
                    className={`flex flex-col items-center justify-start gap-1.5 pt-3 border-2 border-black rounded-t-lg shadow-hard ${styles.width} ${styles.bar}`}
                    style={{ height }}
                  >
                    {entry.rank === 1 ? (
                      <Trophy size={20} className="text-foreground" />
                    ) : (
                      <Medal size={18} className="text-foreground/70" />
                    )}
                    <span className="text-label font-bold">#{entry.rank}</span>
                  </div>
                  <span className="text-label-small font-semibold">
                    {entry.points.toLocaleString()}
                  </span>
                  <div className={`w-2.5 h-2.5 border-2 border-black rounded-full ${styles.dot}`} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
