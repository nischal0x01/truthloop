/**
 * Why — editorial short block.
 * Problem statement: generic media-literacy advice vs. your specific blind spot.
 * Single-column on mobile (gate 52). No invented metrics.
 */
export function WhyTruthLoop() {
  return (
    <section aria-labelledby="why-h" className="border-b-2 border-black bg-yellow">
      <div className="mx-auto grid max-w-7xl gap-8 px-6 py-16 md:grid-cols-12 md:gap-12 md:py-24">
        <div className="md:col-span-5">
          <p className="text-label-small font-semibold uppercase tracking-[0.08em] text-foreground">
            The problem
          </p>
          <h2
            id="why-h"
            className="mt-4 font-display text-display-large text-foreground"
            style={{ minWidth: 0, overflowWrap: 'anywhere' }}
          >
            You are fooled by different things than I am.
          </h2>
        </div>

        <div className="md:col-span-7 md:pt-8">
          <p className="text-body-large text-foreground">
            Every media-literacy quiz ends the same way: a generic checklist of &ldquo;watch for
            source, watch for date, watch for tone.&rdquo; Useful once. Useless on the next
            headline.
          </p>
          <p className="mt-4 text-body-large text-foreground">
            TruthLoop does the opposite. We log what{' '}
            <em className="font-semibold not-italic">specifically</em> fooled you this week —
            manipulated statistics, misattributed quotes, satirical stories mistaken for real news —
            and write a one-line note you can actually use.
          </p>
        </div>
      </div>
    </section>
  );
}
