import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Nav } from '@/components/landing/nav';
import { Hero } from '@/components/landing/hero';
import { WhyTruthLoop } from '@/components/landing/why-truthloop';
import { LoopSteps } from '@/components/landing/loop-steps';
import { BlindSpot } from '@/components/landing/blind-spot';
import { Forecast } from '@/components/landing/forecast';
import { CTA } from '@/components/landing/cta';
import { Footer } from '@/components/landing/footer';
import { SignIn } from '@/pages/SignIn';
import { SignUp } from '@/pages/SignUp';

/* Hallmark · macrostructure: Long Document · tone: editorial + playful
 * theme: Gumroad system (off-white #f4f4f0 · hot-pink #ff90e8 · ABC Favorit)
 * enrichment: none (typography only)
 * nav: N1b canonical · footer: Ft1 editorial statement
 */

const Landing = () => (
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

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
