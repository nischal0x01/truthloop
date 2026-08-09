import { Nav } from '@/components/landing/nav';
import { Hero } from '@/components/landing/hero';
import { WhyTruthLoop } from '@/components/landing/why-truthloop';
import { LoopSteps } from '@/components/landing/loop-steps';
import { BlindSpot } from '@/components/landing/blind-spot';
import { Forecast } from '@/components/landing/forecast';
import { CTA } from '@/components/landing/cta';
import { Footer } from '@/components/landing/footer';

/* Hallmark · macrostructure: Long Document · tone: editorial + playful
 * theme: Gumroad system (off-white #f4f4f0 · hot-pink #ff90e8 · ABC Favorit)
 * enrichment: none (typography only)
 * nav: N1b canonical · footer: Ft1 editorial statement
 */

const App = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <main>
        <Hero />
        <WhyTruthLoop />
        <LoopSteps />
        <BlindSpot />
        <Forecast />
        <CTA />
      </main>
      <Footer />
    </div>
  );
};

export default App;
