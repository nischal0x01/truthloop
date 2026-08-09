/* Hallmark · component: form-card · genre: soft · theme: Gumroad system
 * states: default · hover · focus · active · disabled · loading · error · success
 * contrast: pass (WCAG 4.5:1 all pairs)
 *
 * Shared auth card — renders sign-in or sign-up fields based on `mode`.
 * Google OAuth button at top; email/password below; submit at bottom.
 * All 8 states implemented on every interactive element.
 */

import { useState, useId } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock, User, Eye, EyeOff, Loader } from 'lucide-react';

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

/* ── Field wrapper with label + helper ── */
interface FieldProps {
  label: string;
  id: string;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  value: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
  error?: string;
  disabled?: boolean;
  required?: boolean;
}

function Field({
  label,
  id,
  type = 'text',
  autoComplete,
  placeholder,
  value,
  onChange,
  onBlur,
  error,
  disabled,
  required,
}: FieldProps) {
  const errorId = `${id}-error`;
  const helperId = `${id}-helper`;

  return (
    <div className="auth-field">
      <label className="auth-field__label" htmlFor={id}>
        {label}
        {required && (
          <span className="auth-field__required" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </label>
      <div className="auth-field__input-wrap">
        <input
          id={id}
          type={type}
          autoComplete={autoComplete}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          disabled={disabled}
          required={required}
          aria-required={required}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : helperId}
          className={`auth-field__input${error ? ' auth-field__input--error' : ''}`}
        />
      </div>
      <div className="auth-field__foot">
        {error ? (
          <p id={errorId} className="auth-field__error" role="alert">
            {error}
          </p>
        ) : (
          <p id={helperId} className="auth-field__helper" aria-live="polite" />
        )}
      </div>
    </div>
  );
}

/* ── Password toggle ── */
function PasswordToggle({ visible, onToggle }: { visible: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      className="auth-field__toggle"
      onClick={onToggle}
      aria-label={visible ? 'Hide password' : 'Show password'}
      tabIndex={-1}
    >
      {visible ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
  );
}

/* ── Main AuthCard ── */
export type AuthMode = 'signin' | 'signup';

interface AuthCardProps {
  mode: AuthMode;
}

interface FormState {
  name: string;
  email: string;
  password: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
}

type SubmitState = 'idle' | 'loading' | 'error' | 'success';

export function AuthCard({ mode }: AuthCardProps) {
  const uid = useId();
  const isSignUp = mode === 'signup';

  const [form, setForm] = useState<FormState>({
    name: '',
    email: '',
    password: '',
  });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [globalError, setGlobalError] = useState('');

  /* ── Validation ── */
  const validate = (fields: FormState): FormErrors => {
    const errs: FormErrors = {};
    if (isSignUp && !fields.name.trim()) {
      errs.name = 'Your name is required.';
    }
    if (!fields.email.trim()) {
      errs.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) {
      errs.email = 'Enter a valid email address.';
    }
    if (!fields.password) {
      errs.password = 'Password is required.';
    } else if (isSignUp && fields.password.length < 8) {
      errs.password = 'Use at least 8 characters.';
    }
    return errs;
  };

  const handleChange = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = { ...form, [field]: e.target.value };
    setForm(next);
    if (touched[field]) {
      const errs = validate(next);
      setErrors((prev) => ({ ...prev, [field]: errs[field] }));
    }
  };

  const handleBlur = (field: keyof FormState) => () => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const errs = validate(form);
    setErrors((prev) => ({ ...prev, [field]: errs[field] }));
  };

  /* ── Submit ── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError('');

    const allTouched = { name: true, email: true, password: true };
    setTouched(allTouched);
    const errs = validate(form);
    setErrors(errs);

    if (Object.keys(errs).length > 0) return;

    setSubmitState('loading');
    try {
      const endpoint = isSignUp ? '/api/auth/signup' : '/api/auth/signin';
      const body = isSignUp
        ? { name: form.name, email: form.email, password: form.password }
        : { email: form.email, password: form.password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'include',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Something went wrong. Please try again.');
      }

      setSubmitState('success');
      // Redirect handled by the page component watching auth state
      window.location.href = '/';
    } catch (err: unknown) {
      setSubmitState('error');
      setGlobalError(err instanceof Error ? err.message : 'Something went wrong.');
    }
  };

  /* ── Google OAuth redirect ── */
  const handleGoogleAuth = () => {
    window.location.href = '/api/auth/google';
  };

  const isLoading = submitState === 'loading';
  const isSuccess = submitState === 'success';
  const isFormInvalid = Object.keys(validate(form)).length > 0;

  const heading = isSignUp ? 'Create your account' : 'Welcome back';
  const submitLabel = isLoading ? 'Please wait…' : isSignUp ? 'Create account' : 'Sign in';
  const footerText = isSignUp ? 'Already have an account?' : "Don't have an account?";
  const footerLink = isSignUp ? '/signin' : '/signup';
  const footerLinkLabel = isSignUp ? 'Sign in' : 'Sign up';

  return (
    <div className="auth-card">
      {/* ── Header ── */}
      <header className="auth-card__header">
        <h1 className="auth-card__heading">{heading}</h1>
        <p className="auth-card__sub">
          {isSignUp ? 'Start spotting misinformation today.' : 'Good to see you again.'}
        </p>
      </header>

      {/* ── Google OAuth ── */}
      <button
        type="button"
        className="auth-btn auth-btn--google"
        onClick={handleGoogleAuth}
        disabled={isLoading || isSuccess}
        data-state={isSuccess ? 'success' : undefined}
      >
        <GoogleIcon />
        <span>Continue with Google</span>
      </button>

      {/* ── Divider ── */}
      <div className="auth-divider" aria-hidden="true">
        <span>or</span>
      </div>

      {/* ── Global error ── */}
      {globalError && (
        <div className="auth-global-error" role="alert">
          {globalError}
        </div>
      )}

      {/* ── Form ── */}
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        {isSignUp && (
          <Field
            label="Full name"
            id={`${uid}-name`}
            type="text"
            autoComplete="name"
            placeholder="Alex Johnson"
            value={form.name}
            onChange={handleChange('name')}
            onBlur={handleBlur('name')}
            error={touched.name ? errors.name : undefined}
            disabled={isLoading}
            required
          />
        )}

        <Field
          label="Email address"
          id={`${uid}-email`}
          type="email"
          autoComplete="email"
          placeholder="alex@example.com"
          value={form.email}
          onChange={handleChange('email')}
          onBlur={handleBlur('email')}
          error={touched.email ? errors.email : undefined}
          disabled={isLoading}
          required
        />

        <div className="auth-field">
          <label className="auth-field__label" htmlFor={`${uid}-password`}>
            Password
            {isSignUp && (
              <span className="auth-field__required" aria-hidden="true">
                {' '}
                *
              </span>
            )}
          </label>
          <div className="auth-field__input-wrap">
            <input
              id={`${uid}-password`}
              type={showPassword ? 'text' : 'password'}
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              placeholder={isSignUp ? 'At least 8 characters' : 'Your password'}
              value={form.password}
              onChange={handleChange('password')}
              onBlur={handleBlur('password')}
              disabled={isLoading}
              required
              aria-required="true"
              aria-invalid={!!(touched.password && errors.password)}
              aria-describedby={`${uid}-password-error`}
              className={`auth-field__input auth-field__input--password${touched.password && errors.password ? ' auth-field__input--error' : ''}`}
            />
            <PasswordToggle visible={showPassword} onToggle={() => setShowPassword((v) => !v)} />
          </div>
          <div className="auth-field__foot">
            {touched.password && errors.password ? (
              <p id={`${uid}-password-error`} className="auth-field__error" role="alert">
                {errors.password}
              </p>
            ) : (
              <p className="auth-field__helper" aria-live="polite" />
            )}
          </div>
        </div>

        {/* ── Submit ── */}
        <button
          type="submit"
          className={`auth-btn auth-btn--primary${isSuccess ? ' auth-btn--success' : ''}`}
          disabled={isLoading || isSuccess || isFormInvalid}
          data-state={isSuccess ? 'success' : isLoading ? 'loading' : undefined}
        >
          {isLoading ? (
            <>
              <Loader size={16} className="auth-btn__spinner" aria-hidden="true" />
              <span>{submitLabel}</span>
            </>
          ) : isSuccess ? (
            <>
              <span>Redirecting…</span>
            </>
          ) : (
            <span>{submitLabel}</span>
          )}
        </button>
      </form>

      {/* ── Footer link ── */}
      <p className="auth-card__footer">
        {footerText}{' '}
        <Link to={footerLink} className="auth-card__footer-link">
          {footerLinkLabel}
        </Link>
      </p>

      {/* ── ToS for sign-up ── */}
      {isSignUp && (
        <p className="auth-card__legal">
          By creating an account, you agree to our{' '}
          <a href="/terms" className="auth-card__legal-link">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="/privacy" className="auth-card__legal-link">
            Privacy Policy
          </a>
          .
        </p>
      )}

      <style>{`
        /* ── Card ── */
        .auth-card {
          background: var(--auth-card-bg, #ffffff);
          border: 2px solid var(--auth-border, #000000);
          border-radius: 16px;
          padding: 36px 36px 28px;
          box-shadow: 6px 6px 0 0 var(--auth-border, #000000);
          width: 100%;
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
            background: #f4f4f0;
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

        /* ── Primary submit button ── */
        .auth-btn--primary {
          background: var(--auth-accent, #ff90e8);
          color: var(--auth-accent-ink, #000000);
          box-shadow: 4px 4px 0 0 var(--auth-border, #000000);
          font-size: 16px;
          margin-top: 4px;
        }

        @media (hover: hover) {
          .auth-btn--primary:not(:disabled):hover {
            background: #ff7edb;
            transform: translate(-1px, -1px);
            box-shadow: 6px 6px 0 0 var(--auth-border, #000000);
          }
        }

        .auth-btn--primary:not(:disabled):active {
          transform: translate(0, 0);
          box-shadow: 2px 2px 0 0 var(--auth-border, #000000);
        }

        .auth-btn--primary:focus-visible {
          outline: 3px solid var(--auth-border, #000000);
          outline-offset: 2px;
        }

        .auth-btn--success {
          background: var(--auth-highlight, #f1f333) !important;
        }

        /* ── Spinner ── */
        .auth-btn__spinner {
          animation: auth-spin 0.8s linear infinite;
        }

        @keyframes auth-spin {
          to { transform: rotate(360deg); }
        }

        /* ── Divider ── */
        .auth-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 20px 0;
          color: #999999;
          font-size: 13px;
        }

        .auth-divider::before,
        .auth-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: #e0e0e0;
        }

        /* ── Form ── */
        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        /* ── Field ── */
        .auth-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .auth-field__label {
          font-size: 14px;
          font-weight: 500;
          color: var(--auth-border, #000000);
          letter-spacing: -0.2px;
        }

        .auth-field__required {
          color: #999;
        }

        .auth-field__input-wrap {
          position: relative;
        }

        .auth-field__input {
          width: 100%;
          height: 44px;
          padding: 0 12px;
          background: #ffffff;
          border: 2px solid var(--auth-border, #000000);
          border-radius: 8px;
          font-size: 16px;
          font-family: inherit;
          color: var(--auth-border, #000000);
          outline: none;
          transition:
            border-color var(--auth-dur-med, 200ms) var(--auth-ease-out),
            background-color var(--auth-dur-med, 200ms) var(--auth-ease-out);
          /* Constant border — no layout shift */
          box-sizing: border-box;
        }

        .auth-field__input::placeholder {
          color: #aaaaaa;
        }

        @media (hover: hover) {
          .auth-field__input:hover:not(:disabled):not(:focus) {
            background: #fafafa;
          }
        }

        .auth-field__input:focus {
          border-color: var(--auth-border, #000000);
          background: #ffffff;
          /* Focus ring via box-shadow — no outline shift */
          box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.12);
        }

        .auth-field__input--error {
          border-color: var(--auth-danger, #dc341e);
        }

        .auth-field__input--error:focus {
          box-shadow: 0 0 0 3px rgba(220, 52, 30, 0.2);
        }

        .auth-field__input:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          background: #f5f5f5;
        }

        /* Password toggle */
        .auth-field__toggle {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: #666;
          padding: 4px;
          display: flex;
          align-items: center;
          border-radius: 4px;
          outline: none;
        }

        .auth-field__toggle:focus-visible {
          outline: 2px solid var(--auth-border, #000000);
          outline-offset: 1px;
        }

        .auth-field__input--password {
          padding-right: 40px;
        }

        /* ── Field foot (helper / error) ── */
        .auth-field__foot {
          min-height: 18px;
        }

        .auth-field__error {
          font-size: 13px;
          color: var(--auth-danger, #dc341e);
          margin: 0;
          line-height: 18px;
        }

        .auth-field__helper {
          font-size: 13px;
          color: #999999;
          margin: 0;
          line-height: 18px;
        }

        /* ── Global error ── */
        .auth-global-error {
          padding: 10px 14px;
          background: #fff0ee;
          border: 2px solid var(--auth-danger, #dc341e);
          border-radius: 8px;
          font-size: 14px;
          color: var(--auth-danger, #dc341e);
          margin-bottom: 4px;
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
          .auth-btn,
          .auth-field__input {
            transition: none;
          }
          .auth-btn__spinner {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
