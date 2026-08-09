/**
 * The Loop — three steps of the core product.
 * vote → discuss → earn points.
 * Asymmetric spans on desktop (12-col grid). Collapses to one column on mobile.
 */
export function LoopSteps() {
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

  return (
    <section id="loop" aria-labelledby="loop-h" className="border-b-2 border-black bg-background">
      <div className="mx-auto max-w-7xl px-6 py-16 md:py-24">
        <div className="flex flex-col gap-3 md:max-w-3xl">
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
        </div>

        <ol className="mt-12 grid gap-6 md:grid-cols-3">
          {steps.map((s) => (
            <li
              key={s.n}
              className="relative flex flex-col gap-4 border-2 border-black rounded-lg bg-card p-6 shadow-hard hover-lift"
              style={{ minWidth: 0 }}
            >
              <div className="flex items-center justify-between">
                <span
                  aria-hidden
                  className={`inline-block h-7 w-7 border-2 border-black ${s.swatch}`}
                />
                <span className="font-mono text-label-small text-foreground/60">{s.n}</span>
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
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
