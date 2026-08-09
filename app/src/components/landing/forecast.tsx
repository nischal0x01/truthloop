/**
 * Forecast — the daily AI scam forecast.
 * Three severity cards (high / medium / low). No invented metrics — sample
 * types come from the categories in .ai/05-ai-prompts.md.
 */
export function Forecast() {
  const items = [
    {
      severity: 'high',
      swatch: 'bg-red text-white',
      chip: 'High',
      title: 'Festival-season UPI refund scams',
      body: 'Inbound messages promising a refund for a failed transaction, asking you to &ldquo;verify&rdquo; via a link. Verify any refund request through the original app, never a link.',
    },
    {
      severity: 'medium',
      swatch: 'bg-orange text-black',
      chip: 'Medium',
      title: 'Fake airline refund portals',
      body: 'Look-alike pages that mirror real airline cancellation flows. Always type the airline domain yourself; do not search-and-click.',
    },
    {
      severity: 'low',
      swatch: 'bg-card text-foreground',
      chip: 'Low',
      title: 'Job-offer direct messages',
      body: 'Unsolicited LinkedIn or WhatsApp DMs offering remote work. Real recruiters do not ask for bank details before an interview.',
    },
  ];

  return (
    <section
      id="forecast"
      aria-labelledby="forecast-h"
      className="border-b-2 border-black bg-off-white-surface"
    >
      <div className="mx-auto max-w-7xl px-6 py-16 md:py-24">
        <div className="flex flex-col gap-3 md:max-w-3xl">
          <p className="text-label-small font-semibold uppercase tracking-[0.08em] text-foreground">
            Daily scam forecast
          </p>
          <h2
            id="forecast-h"
            className="font-display text-display-large text-foreground"
            style={{ minWidth: 0, overflowWrap: 'anywhere' }}
          >
            What scammers are doing today.
          </h2>
          <p className="mt-2 text-body-large text-foreground/80">
            Each morning at 06:00 UTC, our AI reads the last 48 hours of headlines and the last week
            of reported scam patterns, and writes three forecasts for the next seven days.
          </p>
        </div>

        <ul className="mt-12 grid gap-6 md:grid-cols-3">
          {items.map((it) => (
            <li
              key={it.title}
              className={`flex flex-col gap-3 border-2 border-black rounded-lg p-6 shadow-hard hover-lift ${it.swatch}`}
              style={{ minWidth: 0 }}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex items-center gap-2 rounded-pill border-2 border-black px-3 py-1 text-label-small font-semibold ${
                    it.severity === 'high' ? 'bg-black text-white' : 'bg-white text-foreground'
                  }`}
                >
                  <span
                    aria-hidden
                    className={`inline-block h-2 w-2 rounded-full border-2 border-black ${
                      it.severity === 'high'
                        ? 'bg-pink-accent'
                        : it.severity === 'medium'
                          ? 'bg-pink-accent'
                          : 'bg-black'
                    }`}
                  />
                  {it.chip}
                </span>
                <span className="text-label-small uppercase tracking-[0.08em] opacity-80">
                  {it.severity}
                </span>
              </div>

              <h3
                className="font-display text-heading-2"
                style={{ minWidth: 0, overflowWrap: 'anywhere' }}
              >
                {it.title}
              </h3>

              <p className="text-body opacity-90" dangerouslySetInnerHTML={{ __html: it.body }} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
