/**
 * Blind Spot — the differentiator.
 * Shows a sample weekly report card (pre-seeded demo account content).
 * Dark panel on the right is the personal narrative; yellow card on the left
 * is the "Replay the claim that fooled you" card.
 */
export function BlindSpot() {
  return (
    <section
      id="blind-spot"
      aria-labelledby="blind-spot-h"
      className="border-b-2 border-black bg-background"
    >
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 md:grid-cols-12 md:gap-12 md:py-24">
        <div className="md:col-span-5">
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
        </div>

        <div className="md:col-span-7">
          <article
            className="border-2 border-black rounded-lg bg-dark-panel text-white shadow-hard"
            aria-label="Sample weekly blind-spot report"
          >
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
                <p className="mt-2 font-display text-display-large text-white">75%</p>
                <p className="mt-1 text-body-small text-white/70">12 of 16 correct</p>
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
          </article>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <p className="rounded-lg border-2 border-black bg-yellow p-4 text-label-small text-foreground">
              <span className="font-semibold">Replay that claim →</span> tap to see the source, the
              debunk, and why it was a manipulated stat.
            </p>
            <p className="rounded-lg border-2 border-black bg-pink-accent p-4 text-label-small text-foreground">
              <span className="font-semibold">Share your report →</span> one-tap link to a
              single-page view of the above.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
