/**
 * Hero — typographic with key product stats.
 * Headline (≤ 7 words), eyebrow line, sub-paragraph, two CTAs, trust strip.
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
            href="/signup"
            className="inline-flex items-center justify-center gap-2 h-14 px-7 bg-pink-accent border-2 border-black rounded-lg text-label font-semibold text-black shadow-hard hover-lift focus-hard"
          >
            Start voting — it&apos;s free
            <span aria-hidden>→</span>
          </a>
          <a
            href="#blind-spot"
            className="inline-flex items-center justify-center gap-2 h-14 px-7 bg-dark-panel border-2 border-black rounded-lg text-label font-semibold text-white shadow-hard hover-lift focus-hard"
          >
            See a sample report
          </a>
        </div>

        {/* Key stats — verifiable product highlights */}
        <div className="flex flex-wrap gap-6 pt-2">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-10 h-10 rounded-lg border-2 border-black bg-yellow">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="12" cy="12" r="10"/>
              </svg>
            </span>
            <span className="text-label text-foreground">Hand-verified claims</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-10 h-10 rounded-lg border-2 border-black bg-pink-accent">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path d="M12 2L2 7l10 5 10-5-10-5z" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            <span className="text-label text-foreground">AI scam forecasts daily</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-10 h-10 rounded-lg border-2 border-black bg-orange">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            <span className="text-label text-foreground">Points &amp; leaderboards</span>
          </div>
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
