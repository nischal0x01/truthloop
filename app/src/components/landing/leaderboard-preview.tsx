/**
 * LeaderboardPreview — shown on landing page for logged-out users.
 * Teaches the leaderboard feature with a mini preview of top ranks.
 * No auth required.
 */
import { Link } from 'react-router-dom';
import { Trophy, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';

/* ── Dummy preview data ── */
const previewData = [
  { rank: 1, name: 'Priya S.', points: 4820, streak: '12 days' },
  { rank: 2, name: 'Marco R.', points: 4350, streak: '8 days' },
  { rank: 3, name: 'Aisha P.', points: 3980, streak: '6 days' },
];

export function LeaderboardPreview() {
  return (
    <section
      id="leaderboard-preview"
      aria-labelledby="leaderboard-h"
      className="border-b-2 border-black bg-yellow"
    >
      <div className="mx-auto max-w-7xl px-6 py-16 md:py-24">
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
        <div className="mt-10 max-w-md">
          <div className="rounded-lg border-2 border-black bg-card p-5 shadow-hard">
            <div className="mb-4 flex items-center gap-2">
              <Trophy size={18} className="text-pink-accent" />
              <span className="text-label font-semibold">Top players today</span>
            </div>
            <div className="space-y-3">
              {previewData.map((entry) => (
                <div key={entry.rank} className="flex items-center gap-3">
                  <span className="flex size-7 items-center justify-center rounded-full bg-yellow border-2 border-black text-label-small font-bold">
                    {entry.rank}
                  </span>
                  <span className="flex-1 text-label truncate">{entry.name}</span>
                  <span className="flex items-center gap-1 text-label-small text-muted-foreground">
                    <Flame size={10} /> {entry.streak}
                  </span>
                  <span className="text-label font-semibold">{entry.points.toLocaleString()}</span>
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
        <div className="mt-8">
          <Button asChild className="bg-dark-panel text-white border-2 border-black rounded-lg shadow-hard hover-lift">
            <Link to="/signup">Start voting — it&apos;s free</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
