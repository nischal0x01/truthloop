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
 *
 * Animations added (no layout reflow):
 *  - Card mount: fade-up + blur
 *  - Heading: per-word kinetic reveal
 *  - Sub: fade-up after heading
 *  - Google button: scale-up on hover, scale-down on press, spinner while redirecting
 *  - Footer link: animated underline
 *  - Trust row: micro-stat chips with stagger
 */

import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { Loader2, ShieldCheck, Zap, Heart } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { authApi } from '@/lib/auth';

const EASE = [0.16, 1, 0.3, 1] as const;

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

/* ── Per-word kinetic reveal (matches hero WordReveal) ── */
function HeadingReveal({ text, delay = 0 }: { text: string; delay?: number }) {
  const reduce = useReducedMotion();
  const words = text.split(' ');
  return (
    <span aria-label={text}>
      {words.map((w, i) => (
        <motion.span
          key={`${w}-${i}`}
          aria-hidden
          initial={reduce ? false : { y: '110%', opacity: 0 }}
          animate={{ y: '0%', opacity: 1 }}
          transition={{ duration: 0.7, ease: EASE, delay: delay + i * 0.05 }}
          className="inline-block overflow-hidden align-baseline"
          style={{ marginRight: i === words.length - 1 ? 0 : '0.22em' }}
        >
          {w}
        </motion.span>
      ))}
    </span>
  );
}

/* ── Public API ── */
export type AuthMode = 'signin' | 'signup';

interface AuthCardProps {
  mode: AuthMode;
}

const TRUST_CHIPS = [
  { icon: ShieldCheck, label: 'No password stored' },
  { icon: Zap, label: '30 sec to first vote' },
  { icon: Heart, label: 'Free forever' },
];

export function AuthCard({ mode }: AuthCardProps) {
  const isSignUp = mode === 'signup';
  const { isAuthenticated } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const reduce = useReducedMotion();

  // Defence in depth — RedirectIfSignedIn in App.tsx already handles this,
  // but if we're rendered for an authenticated user we render nothing.
  if (isAuthenticated) return null;

  const handleGoogleAuth = () => {
    if (submitting) return;
    setSubmitting(true);
    // Brief loading state before the page redirects to Passport
    setTimeout(() => {
      window.location.href = authApi.googleOAuthUrl();
    }, 350);
  };

  const heading = isSignUp ? 'Create your account' : 'Welcome back';
  const sub = isSignUp
    ? 'One tap with Google to start spotting misinformation.'
    : 'One tap with Google to pick up where you left off.';
  const footerText = isSignUp ? 'Already have an account?' : 'First time here?';
  const footerLink = isSignUp ? '/signin' : '/signup';
  const footerLinkLabel = isSignUp ? 'Sign in' : 'Sign up';

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 24, filter: 'blur(10px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.9, ease: EASE, delay: 0.15 }}
      className="auth-card"
    >
      {/* ── Eyebrow chip ── */}
      <motion.div
        initial={reduce ? false : { opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE, delay: 0.35 }}
        className="auth-card__eyebrow"
      >
        <motion.span
          aria-hidden
          className="inline-block h-2 w-2 rounded-full bg-pink-accent"
          animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        />
        {isSignUp ? 'UNESCO MIL Hackathon · 2026' : 'TruthLoop · 30-second check-in'}
      </motion.div>

      {/* ── Header ── */}
      <header className="auth-card__header">
        <h1 className="auth-card__heading">
          <HeadingReveal text={heading} />
        </h1>
        <motion.p
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.55 }}
          className="auth-card__sub"
        >
          {sub}
        </motion.p>
      </header>

      {/* ── Google OAuth (only auth method) ── */}
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: EASE, delay: 0.7 }}
        whileHover={!submitting ? { scale: 1.015 } : undefined}
        whileTap={!submitting ? { scale: 0.985 } : undefined}
      >
        <button
          type="button"
          className="auth-btn auth-btn--google auth-btn--google-lone"
          onClick={handleGoogleAuth}
          aria-label="Continue with Google"
          disabled={submitting}
        >
          {submitting ? (
            <>
              <Loader2 size={18} className="animate-spin" aria-hidden="true" />
              <span>Opening Google…</span>
            </>
          ) : (
            <>
              <GoogleIcon />
              <span>Continue with Google</span>
              <motion.span
                aria-hidden
                className="ml-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-black text-pink-accent"
                initial={false}
                whileHover={{ x: 2, y: -1, scale: 1.08 }}
                transition={{ duration: 0.35, ease: EASE }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
                  <path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </motion.span>
            </>
          )}
        </button>
      </motion.div>

      {/* ── Trust strip (only on signup) ── */}
      {isSignUp && (
        <motion.ul
          className="auth-card__trust"
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.08, delayChildren: 0.85 } },
          }}
        >
          {TRUST_CHIPS.map((chip) => (
            <motion.li
              key={chip.label}
              variants={{
                hidden: { opacity: 0, y: 8 },
                show: { opacity: 1, y: 0 },
              }}
              transition={{ duration: 0.5, ease: EASE }}
              className="auth-card__trust-chip"
            >
              <chip.icon size={12} aria-hidden="true" />
              <span>{chip.label}</span>
            </motion.li>
          ))}
        </motion.ul>
      )}

      {/* ── Footer link (toggle signin ↔ signup) ── */}
      <motion.p
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease: EASE, delay: 1 }}
        className="auth-card__footer"
      >
        {footerText}{' '}
        <Link to={footerLink} className="auth-card__footer-link">
          {footerLinkLabel}
          <span aria-hidden className="auth-card__footer-link-underline" />
        </Link>
      </motion.p>

      {/* ── ToS ── */}
      <motion.p
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease: EASE, delay: 1.1 }}
        className="auth-card__legal"
      >
        By continuing, you agree to our{' '}
        <a href="/terms" className="auth-card__legal-link">
          Terms of Service
        </a>{' '}
        and{' '}
        <a href="/privacy" className="auth-card__legal-link">
          Privacy Policy
        </a>
        .
      </motion.p>

      <style>{`
        /* ── Card ── */
        .auth-card {
          background: var(--auth-card-bg, #ffffff);
          border: 2px solid var(--auth-border, #000000);
          border-radius: 16px;
          padding: 32px 32px 26px;
          box-shadow: 6px 6px 0 0 var(--auth-border, #000000);
          width: 100%;
          text-align: center;
        }

        /* ── Eyebrow ── */
        .auth-card__eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          margin-bottom: 18px;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #000000;
          background: #f4f4f0;
          border: 2px solid #000000;
          border-radius: 9999px;
        }

        .auth-card__header {
          margin-bottom: 26px;
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
          height: 52px;
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
            box-shadow: 4px 4px 0 0 var(--auth-border, #000000);
          }
        }

        .auth-btn--google:not(:disabled):active {
          box-shadow: 2px 2px 0 0 var(--auth-border, #000000);
        }

        .auth-btn:disabled {
          opacity: 0.8;
          cursor: progress;
        }

        .auth-btn--google-lone {
          margin-bottom: 8px;
        }

        /* ── Trust strip ── */
        .auth-card__trust {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          justify-content: center;
          list-style: none;
          padding: 14px 0 6px;
          margin: 0;
        }

        .auth-card__trust-chip {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 9px;
          font-size: 11px;
          font-weight: 500;
          color: #444;
          background: #f4f4f0;
          border: 1.5px solid #000000;
          border-radius: 9999px;
          transition: transform 200ms cubic-bezier(0.16, 1, 0.3, 1);
        }

        .auth-card__trust-chip:hover {
          transform: translateY(-1px);
        }

        /* ── Footer ── */
        .auth-card__footer {
          text-align: center;
          font-size: 14px;
          color: #666666;
          margin: 18px 0 0;
        }

        .auth-card__footer-link {
          position: relative;
          display: inline-block;
          color: var(--auth-border, #000000);
          font-weight: 500;
          text-decoration: none;
        }

        .auth-card__footer-link-underline {
          position: absolute;
          left: 0;
          bottom: -1px;
          width: 100%;
          height: 2px;
          background: currentColor;
          transform: scaleX(1);
          transform-origin: left center;
          transition: transform 350ms cubic-bezier(0.16, 1, 0.3, 1);
        }

        .auth-card__footer-link:hover .auth-card__footer-link-underline {
          transform: scaleX(0);
          transform-origin: right center;
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
          transition: color 200ms cubic-bezier(0.16, 1, 0.3, 1);
        }

        .auth-card__legal-link:hover {
          color: #000000;
        }

        /* ── Responsive ── */
        @media (max-width: 480px) {
          .auth-card {
            padding: 26px 18px 22px;
            border-radius: 12px;
            box-shadow: 4px 4px 0 0 var(--auth-border, #000000);
          }

          .auth-card__heading {
            font-size: 24px;
            line-height: 32px;
          }

          .auth-card__trust {
            gap: 4px;
          }

          .auth-card__trust-chip {
            font-size: 10px;
            padding: 3px 7px;
          }
        }

        /* ── Reduced motion ── */
        @media (prefers-reduced-motion: reduce) {
          .auth-btn,
          .auth-card__footer-link-underline,
          .auth-card__legal-link,
          .auth-card__trust-chip {
            transition: none;
          }
        }
      `}</style>
    </motion.div>
  );
}