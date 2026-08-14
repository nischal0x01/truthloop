/**
 * Email client — thin Resend wrapper with a deterministic dry-run mode.
 *
 * Why dry-run?
 *   The hackathon demo runs on machines where Resend is rarely configured.
 *   Rather than throwing on `RESEND_API_KEY=""`, we log the rendered
 *   payload and resolve with `{ id: 'dry-run', dryRun: true }` so every
 *   call site behaves identically regardless of env. Operators see a
 *   one-line `[email dry-run] to=… subject=…` in their server logs and
 *   can confirm the end-to-end path is wired without spending Resend quota.
 *
 * Real-send path:
 *   - Initialised lazily on first call so a missing API key doesn't crash
 *     server boot. The first call after the env var is populated will
 *     construct the Resend SDK.
 *   - The Resend SDK accepts `from` per-call, but we centralise the default
 *     here so call sites don't repeat the env-var lookup.
 */

import { Resend } from 'resend';
import { config } from '@/config';
import { logger } from '@/utils/logger';

export interface SendEmailArgs {
  to: string;
  subject: string;
  /** Pre-rendered HTML (caller must have already run it through `@react-email/render`). */
  html: string;
  /** Optional plain-text fallback. Most clients render text only if the
    inbox strips HTML, so including it is just defensive. */
  text?: string;
  /** Optional override for the From header. Defaults to `config.resend.from`. */
  from?: string;
  /** Reply-To header — useful for "do not reply here" notes. */
  replyTo?: string;
}

export interface SendEmailResult {
  id: string;
  /** True when the call was short-circuited to a log line (no Resend call). */
  dryRun: boolean;
}

/** Whether the configured API key looks like a live one or a demo placeholder. */
export function isDryRun(apiKey = config.resend.apiKey): boolean {
  if (!apiKey) return true;
  if (apiKey.startsWith('demo_')) return true;
  return false;
}

let _resend: Resend | null = null;

/**
 * Lazy Resend client — initialised on first non-dry-run call. Keeps the
 * SDK out of the import path so a missing API key never throws at boot.
 */
function getClient(): Resend {
  if (!_resend) {
    _resend = new Resend(config.resend.apiKey);
  }
  return _resend;
}

/**
 * Send an email. In dry-run mode this logs `[email dry-run]` with the
 * recipient + subject + html length and returns a synthetic id. In live
 * mode it calls Resend and returns the provider's id (or throws — callers
 * must handle).
 */
export async function sendEmail(args: SendEmailArgs): Promise<SendEmailResult> {
  if (isDryRun()) {
    logger.info(
      {
        to: args.to,
        subject: args.subject,
        from: args.from ?? config.resend.from,
        htmlLength: args.html.length,
        replyTo: args.replyTo ?? null,
      },
      '[email dry-run] sendEmail'
    );
    return { id: 'dry-run', dryRun: true };
  }

  const client = getClient();
  const response = await client.emails.send({
    from: args.from ?? config.resend.from,
    to: args.to,
    subject: args.subject,
    html: args.html,
    text: args.text,
    replyTo: args.replyTo,
  });

  // Resend returns an error envelope on failure. Surface it as a throw so
  // call sites can wrap their own try/catch (cron jobs swallow + log).
  if ('error' in response && response.error) {
    throw new Error(`Resend error: ${response.error.message ?? 'unknown'}`);
  }
  const id =
    'data' in response && response.data && 'id' in response.data
      ? String(response.data.id)
      : 'unknown';

  logger.info({ to: args.to, subject: args.subject, id }, '[email sent]');
  return { id, dryRun: false };
}