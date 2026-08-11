/**
 * Anthropic Claude client for the claim discovery 3-filter pipeline.
 *
 * Uses the official @anthropic-ai/sdk.
 * Model: claude-haiku-4-5 (cheapest, fast, sufficient for classification tasks).
 * Configurable via ANTHROPIC_API_KEY + ANTHROPIC_DEFAULT_MODEL env vars.
 *
 * Every call:
 * - Wraps user input in <user_input> tags (prompt injection guard)
 * - Sets a reasonable max_tokens for the output
 * - Validates response against Zod schema
 * - Falls back to safe defaults on any error
 */

import Anthropic from '@anthropic-ai/sdk';
import { MiniMaxError, FALLBACK_FILTER1, FALLBACK_FILTER2, FALLBACK_FILTER3 } from '../minimax/errors.js';
import {
  Filter1TruthSchema,
  Filter2SentimentSchema,
  Filter3ScamSchema,
  type Filter1Truth,
  type Filter2Sentiment,
  type Filter3Scam,
} from '../minimax/schemas.js';
import {
  FILTER1_SYSTEM,
  FILTER2_SYSTEM,
  filter3SystemPrompt,
  filter1UserPrompt,
  filter2UserPrompt,
  filter3UserPrompt,
} from '../minimax/prompts.js';
import { z } from 'zod';

// ─── Client singleton ────────────────────────────────────────────────────────
function createClient(): Anthropic {
  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY ?? '',
  });
}

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    _client = createClient();
  }
  return _client;
}

function getModel(): string {
  return process.env.ANTHROPIC_DEFAULT_MODEL ?? 'claude-haiku-4-5';
}

// ─── Core call helper ───────────────────────────────────────────────────────
async function callClaude<T>({
  system,
  user,
  schema,
  model,
  attempt = 1,
}: {
  system: string;
  user: string;
  schema: z.ZodSchema<T>;
  model?: string;
  attempt?: number;
}): Promise<T> {
  const client = getClient();
  const modelId = model ?? getModel();

  try {
    const response = await client.messages.create({
      model: modelId,
      max_tokens: 1024,
      temperature: 0.2, // low temperature for factual/analytical tasks
      system,
      messages: [{ role: 'user', content: user }],
    });

    const raw = response.content[0]?.type === 'text'
      ? response.content[0].text
      : '';

    if (!raw) {
      throw new MiniMaxError('Claude returned empty response', 'PARSE_ERROR', true);
    }

    // Strip markdown fences if the model wraps in ```json ... ```
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsed = schema.parse(JSON.parse(cleaned));
    return parsed;
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new MiniMaxError(`Claude returned invalid JSON: ${err.message}`, 'PARSE_ERROR', true);
    }
    if (err instanceof z.ZodError) {
      // Schema validation failed — retry once
      if (attempt === 1) {
        return callClaude({ system, user, schema, model, attempt: 2 });
      }
      throw new MiniMaxError(`Claude response failed Zod validation: ${err.message}`, 'PARSE_ERROR', true);
    }
    if (err instanceof MiniMaxError) {
      throw err;
    }
    // Anthropic API errors (rate limit, timeout, etc.)
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('timeout') || msg.includes('TIMEOUT')) {
      throw new MiniMaxError('Claude request timed out', 'TIMEOUT', true);
    }
    if (msg.includes('rate_limit') || msg.includes('rate limit') || msg.includes('429')) {
      throw new MiniMaxError('Claude rate limit exceeded', 'RATE_LIMIT', true);
    }
    throw new MiniMaxError(`Claude API error: ${msg}`, 'API_ERROR', false);
  }
}

// ─── Filter 1: Truth Check ───────────────────────────────────────────────────
export async function filter1TruthCheck(
  claim: { rawText: string; sourceName: string; sourceUrl?: string }
): Promise<Filter1Truth> {
  try {
    const userPrompt = filter1UserPrompt(claim);
    return await callClaude({
      system: FILTER1_SYSTEM,
      user: userPrompt,
      schema: Filter1TruthSchema,
    });
  } catch (err) {
    if (err instanceof MiniMaxError && !err.retryable) {
      return FALLBACK_FILTER1;
    }
    return FALLBACK_FILTER1;
  }
}

// ─── Filter 2: Sentiment Check ───────────────────────────────────────────────
export async function filter2SentimentCheck(
  claim: { rawText: string; sourceName: string },
  f1: Filter1Truth
): Promise<Filter2Sentiment> {
  try {
    const userPrompt = filter2UserPrompt(claim, f1);
    return await callClaude({
      system: FILTER2_SYSTEM,
      user: userPrompt,
      schema: Filter2SentimentSchema,
    });
  } catch (err) {
    if (err instanceof MiniMaxError && !err.retryable) {
      return FALLBACK_FILTER2;
    }
    return FALLBACK_FILTER2;
  }
}

// ─── Filter 3: Scam Verification ────────────────────────────────────────────
export async function filter3ScamVerification(
  claim: { rawText: string; sourceName: string },
  f1: Filter1Truth,
  f2: Filter2Sentiment
): Promise<Filter3Scam> {
  try {
    const systemPrompt = filter3SystemPrompt(f1, f2);
    const userPrompt = filter3UserPrompt(claim, f1, f2);
    return await callClaude({
      system: systemPrompt,
      user: userPrompt,
      schema: Filter3ScamSchema,
    });
  } catch (err) {
    if (err instanceof MiniMaxError && !err.retryable) {
      return FALLBACK_FILTER3;
    }
    return FALLBACK_FILTER3;
  }
}
