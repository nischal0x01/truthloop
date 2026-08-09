/**
 * Final CTA — sign-in anchor.
 * Hot-pink ground, dark-panel text. Single button. Mobile-first.
 */
export function CTA() {
  return (
    <section id="start" aria-labelledby="cta-h" className="border-b-2 border-black bg-pink-accent">
      <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
        <div className="grid gap-10 md:grid-cols-12 md:items-end">
          <div className="md:col-span-8">
            <h2
              id="cta-h"
              className="font-display text-display-large text-foreground"
              style={{ minWidth: 0, overflowWrap: 'anywhere' }}
            >
              Find out what you keep falling for.
            </h2>
            <p className="mt-4 max-w-2xl text-body-large text-foreground/80">
              Free, no ads, and your guess history is yours. Sign in with Google and the first claim
              is on the screen in five seconds.
            </p>
          </div>

          <div className="md:col-span-4 flex md:justify-end">
            <a
              href="#sign-in"
              className="inline-flex items-center justify-center gap-2 h-14 px-8 bg-dark-panel border-2 border-black rounded-lg text-label font-semibold text-white shadow-hard hover-lift focus-hard"
            >
              Sign in with Google
              <span aria-hidden>→</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
