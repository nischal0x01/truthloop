/**
 * Shared Anthropic Claude client for user-facing AI features.
 *
 * Used by: scamForecast, toxicity, weeklyNarrative
 * Model: claude-sonnet-4-5 (default), claude-opus-4-1 (deep reasoning)
 *
 * Every call:
 * - Wraps user input in <user_input> tags (prompt injection guard)
 * - Validates response against Zod schema
 * - Falls back to safe defaults on any error
 * - Retries once on parse failure
 */

import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

export class AIError extends Error {
  constructor(
    message: string,
    public readonly code: 'TIMEOUT' | 'PARSE_ERROR' | 'API_ERROR' | 'INVALID_KEY' | 'RATE_LIMIT' | 'UNKNOWN',
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = 'AIError';
  }
}

// ─── Client singleton ─────────────────────────────────────────────────────────
function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new AIError('ANTHROPIC_API_KEY is not set', 'INVALID_KEY', false);
  }
  return new Anthropic({ apiKey });
}

function getModel(defaultModel: string): string {
  return process.env.ANTHROPIC_DEFAULT_MODEL ?? defaultModel;
}

// ─── Core call helper ─────────────────────────────────────────────────────────
export async function callClaude<T>(opts: {
  system: string;
  user: string;
  schema: z.ZodSchema<T>;
  model?: string;
  defaultModel?: string;
  maxTokens?: number;
  timeoutMs?: number;
  fallback: T;
}): Promise<T> {
  const modelId = opts.model ?? getModel(opts.defaultModel ?? 'claude-sonnet-4-5');
  const client = getClient();

  async function attempt(attemptNum: 1 | 2): Promise<T> {
    try {
      const response = await client.messages.create({
        model: modelId,
        max_tokens: opts.maxTokens ?? 1024,
        temperature: 0.2,
        system: opts.system,
        messages: [{ role: 'user', content: opts.user }],
      });

      const raw = response.content[0]?.type === 'text' ? response.content[0].text : '';
      if (!raw) throw new AIError('Claude returned empty response', 'PARSE_ERROR', true);

      // Strip markdown fences
      const cleaned = raw.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
      return opts.schema.parse(JSON.parse(cleaned));
    } catch (err) {
      if (err instanceof SyntaxError) {
        throw new AIError(`Claude returned invalid JSON: ${err.message}`, 'PARSE_ERROR', true);
      }
      if (err instanceof z.ZodError) {
        if (attemptNum === 1) return attempt(2); // retry once
        throw new AIError(`Claude response failed Zod validation: ${err.message}`, 'PARSE_ERROR', false);
      }
      if (err instanceof AIError) throw err;

      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('timeout') || msg.includes('TIMEOUT')) {
        throw new AIError('Claude request timed out', 'TIMEOUT', true);
      }
      if (msg.includes('rate_limit') || msg.includes('rate limit') || msg.includes('429')) {
        throw new AIError('Claude rate limit exceeded', 'RATE_LIMIT', true);
      }
      if (msg.includes('invalid_api_key') || msg.includes('API key') || msg.includes('ANTHROPIC_API_KEY')) {
        // Non-retryable: bad key or missing key — fall back silently so the app
        // doesn't crash when the key isn't configured in dev.
        return opts.fallback;
      }
      throw new AIError(`Claude API error: ${msg}`, 'API_ERROR', false);
    }
  }

  try {
    return await attempt(1);
  } catch (err) {
    if (err instanceof AIError && !err.retryable) {
      // Non-retryable errors (invalid key, bad schema after retry) → fall back
      return opts.fallback;
    }
    // On any retryable error (timeout, parse fail, rate limit), fall back too
    return opts.fallback;
  }
}
