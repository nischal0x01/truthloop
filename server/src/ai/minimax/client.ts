/**
 * MiniMax AI client — OpenAI-compatible interface.
 *
 * Uses the OpenAI SDK pointing at MiniMax's API endpoint.
 * The SDK is configured with:
 * - MiniMax base URL from env
 * - API key from env
 * - Model from env (default: minimax-m2.5)
 * - Per-call timeout (default: 5000ms)
 * - JSON mode response (forced by the SDK)
 *
 * Falls back to safe defaults on any error so the app never breaks.
 */

import OpenAI from 'openai';
import { MiniMaxError, FALLBACK_FILTER1, FALLBACK_FILTER2, FALLBACK_FILTER3 } from './errors.js';
import {
  Filter1TruthSchema,
  Filter2SentimentSchema,
  Filter3ScamSchema,
  type Filter1Truth,
  type Filter2Sentiment,
  type Filter3Scam,
} from './schemas.js';
import {
  FILTER1_SYSTEM,
  FILTER2_SYSTEM,
  filter3SystemPrompt,
  filter1UserPrompt,
  filter2UserPrompt,
  filter3UserPrompt,
} from './prompts.js';
import { Today } from '../shared.js';

// ─── Client singleton ────────────────────────────────────────────────────────
function createClient(): OpenAI {
  const baseURL = process.env.MINIMAX_BASE_URL ?? 'https://api.minimax.chat/v1';
  const apiKey = process.env.MINIMAX_API_KEY ?? '';

  if (!apiKey) {
    throw new MiniMaxError('MINIMAX_API_KEY is not set', 'INVALID_KEY', false);
  }

  return new OpenAI({
    baseURL,
    apiKey,
    timeout: parseInt(process.env.MINIMAX_TIMEOUT_MS ?? '5000', 10),
    maxRetries: 1,
    defaultQuery: {
      ...(process.env.MINIMAX_MODEL_GROUP ? { 'model_group': process.env.MINIMAX_MODEL_GROUP } : {}),
    },
  });
}

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    _client = createClient();
  }
  return _client;
}

// ─── Model resolution ────────────────────────────────────────────────────────
function getModel(): string {
  return process.env.MINIMAX_DEFAULT_MODEL ?? 'MiniMax/MiniMax-Text-01';
}

// ─── Core call helper ───────────────────────────────────────────────────────
async function callMiniMax<T>({
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
    const response = await client.chat.completions.create({
      model: modelId,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.2, // low temperature for factual/analytical tasks
      max_tokens: 1024,
    });

    const raw = response.choices[0]?.message?.content ?? '';

    // Strip markdown fences if the model wraps in ```json ... ```
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();

    const parsed = schema.parse(JSON.parse(cleaned));
    return parsed;
  } catch (err) {
    // Distinguish error types for better fallback handling
    if (err instanceof SyntaxError) {
      throw new MiniMaxError(`MiniMax returned invalid JSON: ${err.message}`, 'PARSE_ERROR', true);
    }
    if (err instanceof z.ZodError) {
      // Schema validation failed — retry once
      if (attempt === 1) {
        return callMiniMax({ system, user, schema, model, attempt: 2 });
      }
      throw new MiniMaxError(`MiniMax response failed Zod validation: ${err.message}`, 'PARSE_ERROR', true);
    }
    if (err instanceof MiniMaxError) {
      throw err;
    }
    // OpenAI errors (timeout, rate limit, etc.)
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('timeout') || msg.includes('TIMEOUT')) {
      throw new MiniMaxError('MiniMax request timed out', 'TIMEOUT', true);
    }
    if (msg.includes('rate_limit') || msg.includes('rate limit')) {
      throw new MiniMaxError('MiniMax rate limit exceeded', 'RATE_LIMIT', true);
    }
    throw new MiniMaxError(`MiniMax API error: ${msg}`, 'API_ERROR', false);
  }
}

// ─── Zod import (needed for the parse error catch) ──────────────────────────
import { z } from 'zod';

// ─── Filter 1: Truth Check ───────────────────────────────────────────────────
export async function filter1TruthCheck(
  claim: { rawText: string; sourceName: string; sourceUrl?: string }
): Promise<Filter1Truth> {
  try {
    const userPrompt = filter1UserPrompt({ ...claim, today: Today });
    return await callMiniMax({
      system: FILTER1_SYSTEM,
      user: userPrompt,
      schema: Filter1TruthSchema,
    });
  } catch (err) {
    if (err instanceof MiniMaxError && !err.retryable) {
      return FALLBACK_FILTER1;
    }
    // retryable errors already exhausted 1 retry above
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
    return await callMiniMax({
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
    return await callMiniMax({
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
