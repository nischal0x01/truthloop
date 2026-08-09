/**
 * Footer — Ft1 editorial statement.
 * Built for the UNESCO MIL Hackathon. Single line of legal, no fake social
 * rows, no fake logos. Honest copy throughout.
 */
export function Footer() {
  return (
    <footer className="bg-background">
      <div className="mx-auto max-w-7xl px-6 py-12 md:py-16">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-6">
            <p className="font-display text-heading-1 text-foreground">TruthLoop</p>
            <p
              className="mt-3 max-w-md text-body text-foreground/70"
              style={{ minWidth: 0, overflowWrap: 'anywhere' }}
            >
              A gamified misinformation-literacy platform built for the UNESCO MIL Hackathon.
              Hand-verified claims, AI moderation, personal weekly reports.
            </p>
          </div>

          <nav aria-label="Footer" className="grid gap-8 md:col-span-6 md:grid-cols-3">
            <div>
              <p className="text-label-small font-semibold uppercase tracking-[0.08em] text-foreground">
                Product
              </p>
              <ul className="mt-3 flex flex-col gap-2">
                <li>
                  <a
                    href="#loop"
                    className="text-body text-foreground hover:underline underline-offset-4"
                  >
                    How it works
                  </a>
                </li>
                <li>
                  <a
                    href="#blind-spot"
                    className="text-body text-foreground hover:underline underline-offset-4"
                  >
                    Blind spot
                  </a>
                </li>
                <li>
                  <a
                    href="#forecast"
                    className="text-body text-foreground hover:underline underline-offset-4"
                  >
                    Forecast
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <p className="text-label-small font-semibold uppercase tracking-[0.08em] text-foreground">
                Build
              </p>
              <ul className="mt-3 flex flex-col gap-2">
                <li>
                  <a
                    href="https://github.com"
                    className="text-body text-foreground hover:underline underline-offset-4"
                  >
                    Source
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-body text-foreground hover:underline underline-offset-4"
                  >
                    Architecture
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <p className="text-label-small font-semibold uppercase tracking-[0.08em] text-foreground">
                Hackathon
              </p>
              <ul className="mt-3 flex flex-col gap-2">
                <li>
                  <a
                    href="#"
                    className="text-body text-foreground hover:underline underline-offset-4"
                  >
                    Demo account
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-body text-foreground hover:underline underline-offset-4"
                  >
                    Pitch deck
                  </a>
                </li>
              </ul>
            </div>
          </nav>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t-2 border-black pt-6 text-label-small text-foreground/60 md:flex-row md:items-center md:justify-between">
          <p>© 2026 TruthLoop · Built for the UNESCO MIL Hackathon</p>
          <p>UNESCO MIL Hackathon · AI + MIL category</p>
        </div>
      </div>
    </footer>
  );
}
