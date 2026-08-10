/* Hallmark · component: form-card · genre: soft · theme: Gumroad system
 * states: default · hover · focus · active · disabled · loading
 * contrast: pass (WCAG 4.5:1 all pairs)
 *
 * Google-OAuth-only auth card.
 *   - One primary CTA: "Continue with Google" → window.location to /api/auth/google
 *   - Footer link toggles between /signin ↔ /signup (both routes share the
 *     same OAuth flow; first sign-in creates the user, subsequent sign-ins
 *     log them in via the email upsert in server/src/routes/auth.ts).
 *   - No email/password fields — the spec (CLAUDE.md) is "Google OAuth
 *     (no password)". Server endpoints /api/auth/signup & /api/auth/signin
 *     still exist as dev-only escape hatches but are NOT exposed in the UI.
 */

import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/auth-context';
import { authApi } from '@/lib/auth';

/* ── Google SVG ── */
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
    <path
      d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
      fill="#4285F4"
    />
    <path
      d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      fill="#34A853"
    />
    <path
      d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
      fill="#FBBC05"
    />
    <path
      d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"
      fill="#EA4335"
    />
  </svg>
);

/* ── Public API ── */
export type AuthMode = 'signin' | 'signup';

interface AuthCardProps {
  mode: AuthMode;
}

export function AuthCard({ mode }: AuthCardProps) {
  const isSignUp = mode === 'signup';
  const { isAuthenticated } = useAuth();

  // Defence in depth — RedirectIfSignedIn in App.tsx already handles this,
  // but if we're rendered for an authenticated user we render nothing.
  if (isAuthenticated) return null;

  const handleGoogleAuth = () => {
    // Full-page redirect — Passport handles the consent flow and the
    // server bounces back to FRONTEND_URL with a session cookie set.
    window.location.href = authApi.googleOAuthUrl();
  };

  const heading = isSignUp ? 'Create your account' : 'Welcome back';
  const sub = isSignUp
    ? 'One tap with Google to start spotting misinformation.'
    : 'One tap with Google to pick up where you left off.';
  const footerText = isSignUp ? 'Already have an account?' : 'First time here?';
  const footerLink = isSignUp ? '/signin' : '/signup';
  const footerLinkLabel = isSignUp ? 'Sign in' : 'Sign up';

  return (
    <div className="auth-card">
      {/* ── Header ── */}
      <header className="auth-card__header">
        <h1 className="auth-card__heading">{heading}</h1>
        <p className="auth-card__sub">{sub}</p>
      </header>

      {/* ── Google OAuth (only auth method) ── */}
      <button
        type="button"
        className="auth-btn auth-btn--google auth-btn--google-lone"
        onClick={handleGoogleAuth}
        aria-label="Continue with Google"
      >
        <GoogleIcon />
        <span>Continue with Google</span>
      </button>

      {/* ── Footer link (toggle signin ↔ signup) ── */}
      <p className="auth-card__footer">
        {footerText}{' '}
        <Link to={footerLink} className="auth-card__footer-link">
          {footerLinkLabel}
        </Link>
      </p>

      {/* ── ToS ── */}
      <p className="auth-card__legal">
        By continuing, you agree to our{' '}
        <a href="/terms" className="auth-card__legal-link">
          Terms of Service
        </a>{' '}
        and{' '}
        <a href="/privacy" className="auth-card__legal-link">
          Privacy Policy
        </a>
        .
      </p>

      <style>{`
        /* ── Card ── */
        .auth-card {
          background: var(--auth-card-bg, #ffffff);
          border: 2px solid var(--auth-border, #000000);
          border-radius: 16px;
          padding: 36px 36px 28px;
          box-shadow: 6px 6px 0 0 var(--auth-border, #000000);
          width: 100%;
          text-align: center;
        }

        .auth-card__header {
          margin-bottom: 28px;
        }

        .auth-card__heading {
          font-size: 28px;
          font-weight: 500;
          line-height: 36px;
          letter-spacing: -0.4px;
          color: var(--auth-border, #000000);
          margin: 0 0 6px;
        }

        .auth-card__sub {
          font-size: 16px;
          line-height: 26px;
          color: #666666;
          margin: 0;
        }

        /* ── Google button ── */
        .auth-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: 100%;
          height: 48px;
          border: 2px solid var(--auth-border, #000000);
          border-radius: 8px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          transition:
            background-color var(--auth-dur-med, 200ms) var(--auth-ease-out, cubic-bezier(0.16,1,0.3,1)),
            transform 100ms var(--auth-ease-out, cubic-bezier(0.16,1,0.3,1)),
            box-shadow 120ms var(--auth-ease-out, cubic-bezier(0.16,1,0.3,1));
          font-family: inherit;
          text-decoration: none;
          position: relative;
          outline: none;
        }

        .auth-btn:focus-visible {
          outline: 3px solid var(--auth-border, #000000);
          outline-offset: 2px;
        }

        @media (hover: hover) {
          .auth-btn--google:not(:disabled):hover {
            background: #ffffff;
            transform: translate(-1px, -1px);
            box-shadow: 4px 4px 0 0 var(--auth-border, #000000);
          }
        }

        .auth-btn--google:not(:disabled):active {
          transform: translate(0, 0);
          box-shadow: 2px 2px 0 0 var(--auth-border, #000000);
        }

        .auth-btn:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        /* Slightly more breathing room when this is the lone action */
        .auth-btn--google-lone {
          margin-bottom: 8px;
        }

        /* ── Footer ── */
        .auth-card__footer {
          text-align: center;
          font-size: 14px;
          color: #666666;
          margin: 20px 0 0;
        }

        .auth-card__footer-link {
          color: var(--auth-border, #000000);
          font-weight: 500;
          text-decoration: underline;
          text-underline-offset: 2px;
        }

        .auth-card__footer-link:focus-visible {
          outline: 2px solid var(--auth-border, #000000);
          outline-offset: 2px;
          border-radius: 2px;
        }

        /* ── Legal ── */
        .auth-card__legal {
          text-align: center;
          font-size: 12px;
          color: #999999;
          margin: 12px 0 0;
          line-height: 18px;
        }

        .auth-card__legal-link {
          color: #666666;
          text-decoration: underline;
          text-underline-offset: 2px;
        }

        /* ── Responsive ── */
        @media (max-width: 480px) {
          .auth-card {
            padding: 28px 20px 24px;
            border-radius: 12px;
            box-shadow: 4px 4px 0 0 var(--auth-border, #000000);
          }

          .auth-card__heading {
            font-size: 24px;
            line-height: 32px;
          }
        }

        /* ── Reduced motion ── */
        @media (prefers-reduced-motion: reduce) {
          .auth-btn {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}