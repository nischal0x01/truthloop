/**
 * Hero — typographic only.
 * Headline (≤ 7 words), eyebrow line, sub-paragraph, two CTAs.
 * Roman type throughout (gate 38a). No invented metrics.
 */
export function Hero() {
  return (
    <section
      id="top"
      className="relative isolate overflow-x-clip border-b-2 border-black bg-background"
    >
      <div className="mx-auto grid max-w-7xl gap-10 px-6 pb-20 pt-16 md:gap-14 md:pb-28 md:pt-24">
        {/* eyebrow */}
        <div className="flex items-center gap-3">
          <span aria-hidden className="inline-block h-3 w-3 bg-pink-accent border-2 border-black" />
          <span className="text-label-small font-semibold uppercase tracking-[0.08em] text-foreground">
            UNESCO MIL Hackathon · 2026
          </span>
        </div>

        {/* headline */}
        <h1
          className="font-display text-display-hero text-foreground"
          style={{ minWidth: 0, overflowWrap: 'anywhere' }}
        >
          Vote the news.{' '}
          <span className="bg-pink-accent px-2 border-2 border-black shadow-hard-sm">
            Find your blind spot.
          </span>
        </h1>

        {/* sub */}
        <p className="max-w-2xl text-body-large text-foreground/80">
          TruthLoop turns the day&rsquo;s trending claims into a 30-second vote. We log what fooled
          you, then write a personal weekly report on the exact type of misinformation you keep
          falling for.
        </p>

        {/* CTAs */}
        <div className="flex flex-wrap items-center gap-4">
          <a
            href="#start"
            className="inline-flex items-center justify-center gap-2 h-14 px-7 bg-pink-accent border-2 border-black rounded-lg text-label font-semibold text-black shadow-hard hover-lift focus-hard"
          >
            Start voting
            <span aria-hidden>→</span>
          </a>
          <a
            href="#blind-spot"
            className="inline-flex items-center justify-center gap-2 h-14 px-7 bg-dark-panel border-2 border-black rounded-lg text-label font-semibold text-white shadow-hard hover-lift focus-hard"
          >
            See a sample report
          </a>
        </div>

        {/* trust strip — no invented metrics, just the verifiable hooks */}
        <ul className="flex flex-wrap gap-x-8 gap-y-3 pt-2 text-label-small text-foreground/70">
          <li className="flex items-center gap-2">
            <span aria-hidden className="inline-block h-2 w-2 bg-red border-2 border-black" />
            Pre-verified by hand
          </li>
          <li className="flex items-center gap-2">
            <span aria-hidden className="inline-block h-2 w-2 bg-yellow border-2 border-black" />
            AI moderation on every comment
          </li>
          <li className="flex items-center gap-2">
            <span aria-hidden className="inline-block h-2 w-2 bg-orange border-2 border-black" />
            No tracking, no ads
          </li>
        </ul>
      </div>
    </section>
  );
}
