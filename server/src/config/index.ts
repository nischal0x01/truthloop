/**
 * Centralised env-var loading. Reading through this object instead of
 * `process.env.X` directly keeps string defaults + required-field logic
 * in one auditable place.
 *
 * All new env vars should be added here AND to `.env.example`. Keep the
 * defaults permissive in dev (localhost, blank keys) so the server boots
 * even with no `.env` file — but fail loudly in production for required
 * keys (JWT_SECRET, RESEND_API_KEY, etc.) by checking here if/when needed.
 */

const envInt = (raw: string | undefined, fallback: number): number => {
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
};

export const config = {
  port: Number.parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: envInt(process.env.DB_PORT, 5432),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'mirror',
  },
  app: {
    /**
     * Public-facing base URL for the frontend. Used as the origin of CTA
     * links inside outbound emails (digest / weekly report / instant alert).
     * Defaults to localhost in dev; set via APP_URL in prod.
     */
    url: process.env.APP_URL || 'http://localhost:5173',
  },
  resend: {
    /**
     * Resend API key. When blank or prefixed with `demo_`, every send
     * short-circuits to a structured log line and resolves with
     * `{ id: 'dry-run', dryRun: true }`. This guarantees the demo runs
     * even when Resend isn't configured yet.
     */
    apiKey: process.env.RESEND_API_KEY || '',
    /**
     * Default From: header for outbound emails. Must be a verified sender
     * in your Resend dashboard. In dev with dry-run mode, the value is
     * still logged but never used by Resend.
     */
    from: process.env.EMAIL_FROM || 'noreply@yourdomain.com',
  },
  cron: {
    /**
     * Set CRON_ENABLED=false to skip registering scheduled jobs entirely
     * (test runs, one-off debug sessions). The job modules' `runXxx()`
     * helpers are still callable directly for manual triggers.
     */
    enabled: (process.env.CRON_ENABLED ?? 'true').toLowerCase() !== 'false',
    timezone: process.env.CRON_TIMEZONE || 'UTC',
  },
} as const;

export type AppConfig = typeof config;