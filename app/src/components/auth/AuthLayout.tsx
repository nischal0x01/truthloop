/* Hallmark · macrostructure: Split Sign · tone: soft · anchor hue: pink #ff90e8
 * genre: modern-minimal-adjacent · theme: Gumroad system (off-white · hot-pink accent)
 * nav: N1a minimal (2-link) · footer: Ft1 editorial statement
 * motion: input-glow · button-lift · error-shake
 * component: layout · states: default
 */

/*
 * Split Sign — two-panel auth layout
 * Left (40%): dark brand panel — TruthLoop wordmark + tagline + decorative mark
 * Right (60%): off-white paper — form card, vertically centred
 *
 * Mobile: stacked — brand panel collapses to a compact header bar,
 * form panel takes full width below it.
 */

import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="auth-root">
      {/* ── Left panel: brand ── */}
      <aside className="auth-brand">
        <Link to="/" className="auth-brand__wordmark">
          <ShieldCheck size={28} strokeWidth={2} />
          <span>TruthLoop</span>
        </Link>

        <div className="auth-brand__body">
          <p className="auth-brand__tagline">
            Don't be fooled.
            <br />
            Spot the lies. Level up.
          </p>
          <p className="auth-brand__sub">
            Join thousands who vote, discuss, and learn to
            <br />
            navigate a world full of misinformation.
          </p>
        </div>

        {/* Decorative mark — CSS geometric, Gumroad-style coin motif */}
        <div className="auth-brand__decoration" aria-hidden="true">
          <div className="auth-brand__coin" />
          <div className="auth-brand__coin auth-brand__coin--offset" />
        </div>
      </aside>

      {/* ── Right panel: form ── */}
      <main className="auth-form-panel">
        <div className="auth-form-wrap">{children}</div>
      </main>

      <style>{`
        /* ── Layout tokens ── */
        :root {
          --auth-split-ratio: 40%;
          --auth-brand-bg: #242423;
          --auth-brand-text: #ffffff;
          --auth-paper: #f4f4f0;
          --auth-card-bg: #ffffff;
          --auth-border: #000000;
          --auth-accent: #ff90e8;
          --auth-accent-ink: #000000;
          --auth-panel: #242423;
          --auth-panel-ink: #ffffff;
          --auth-danger: #dc341e;
          --auth-highlight: #f1f333;

          --auth-ease-out: cubic-bezier(0.16, 1, 0.3, 1);
          --auth-ease-in: cubic-bezier(0.7, 0, 0.84, 0);
          --auth-dur-fast: 120ms;
          --auth-dur-med: 200ms;
        }

        /* ── Reset ── */
        .auth-root {
          display: flex;
          min-height: 100dvh;
          background: var(--auth-paper);
          color: var(--auth-border);
          font-family: var(--font-sans, 'Inter', system-ui, sans-serif);
          overflow-x: clip;
        }

        /* ── Left brand panel ── */
        .auth-brand {
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: center;
          width: var(--auth-split-ratio);
          min-width: 280px;
          padding: 48px 40px;
          background: var(--auth-brand-bg);
          color: var(--auth-brand-text);
          overflow: hidden;
        }

        .auth-brand__wordmark {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 20px;
          font-weight: 500;
          color: var(--auth-brand-text);
          text-decoration: none;
          letter-spacing: -0.4px;
          margin-bottom: 64px;
        }

        .auth-brand__body {
          position: relative;
          z-index: 1;
        }

        .auth-brand__tagline {
          font-size: 36px;
          font-weight: 500;
          line-height: 44px;
          letter-spacing: -0.4px;
          color: var(--auth-brand-text);
          margin: 0 0 20px;
        }

        .auth-brand__sub {
          font-size: 16px;
          line-height: 26px;
          color: #dddddd;
          margin: 0;
        }

        /* ── Coin decoration (Gumroad signature) ── */
        .auth-brand__decoration {
          position: absolute;
          right: -40px;
          bottom: -40px;
          width: 200px;
          height: 200px;
        }

        .auth-brand__coin {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 3px solid var(--auth-accent);
          opacity: 0.6;
        }

        .auth-brand__coin--offset {
          inset: 16px;
          border-color: rgba(255, 144, 232, 0.3);
        }

        /* ── Right form panel ── */
        .auth-form-panel {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px 24px;
        }

        .auth-form-wrap {
          width: 100%;
          max-width: 420px;
        }

        /* ── Mobile ── */
        @media (max-width: 767px) {
          .auth-root {
            flex-direction: column;
          }

          .auth-brand {
            width: 100%;
            min-width: unset;
            padding: 24px 24px 32px;
            margin-bottom: 0;
          }

          .auth-brand__wordmark {
            margin-bottom: 24px;
          }

          .auth-brand__tagline {
            font-size: 24px;
            line-height: 32px;
            margin-bottom 16px;
          }

          .auth-brand__sub {
            font-size: 14px;
            line-height: 22px;
            display: none;
          }

          .auth-brand__decoration {
            width: 100px;
            height: 100px;
            right: -20px;
            bottom: -20px;
          }

          .auth-form-panel {
            padding: 32px 20px 48px;
          }
        }

        /* ── Reduced motion ── */
        @media (prefers-reduced-motion: reduce) {
          .auth-brand__decoration {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}
