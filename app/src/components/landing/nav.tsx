import { Button } from '@/components/ui/button';

/**
 * Top nav — N1b (canonical SaaS three-section).
 * Wordmark left · inline links center · CTA right.
 * Sticky on scroll, off-white ground, 1px black bottom border (no shadow).
 */
export function Nav() {
  return (
    <header className="sticky top-0 z-50 bg-background border-b-2 border-black">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-4">
        <a
          href="#top"
          className="font-sans text-label font-semibold tracking-[-0.02em]"
          aria-label="TruthLoop — home"
        >
          TruthLoop
        </a>

        <nav aria-label="Primary" className="hidden items-center gap-8 md:flex">
          <a href="#loop" className="text-label text-foreground hover:underline underline-offset-4">
            How it works
          </a>
          <a
            href="#blind-spot"
            className="text-label text-foreground hover:underline underline-offset-4"
          >
            Blind spot
          </a>
          <a
            href="#forecast"
            className="text-label text-foreground hover:underline underline-offset-4"
          >
            Forecast
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <a
            href="#sign-in"
            className="hidden text-label text-foreground hover:underline underline-offset-4 sm:inline"
          >
            Sign in
          </a>
          <Button
            asChild
            className="bg-pink-accent text-black border-2 border-black rounded-lg shadow-hard hover-lift"
          >
            <a href="#start">Get started</a>
          </Button>
        </div>
      </div>
    </header>
  );
}
