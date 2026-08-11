/**
 * MiniMax AI errors and fallback responses.
 * Every AI call has a documented fallback so the app never breaks when the
 * AI is unavailable or returns malformed output.
 */

export class MiniMaxError extends Error {
  constructor(
    message: string,
    public readonly code: 'TIMEOUT' | 'PARSE_ERROR' | 'API_ERROR' | 'INVALID_KEY' | 'RATE_LIMIT' | 'UNKNOWN',
    public readonly retryable: boolean = false
  ) {
    super(message);
    this.name = 'MiniMaxError';
  }
}

/** Fallback for Filter 1 (Truth Check) — fail open to 'unverifiable' */
export const FALLBACK_FILTER1 = {
  verdict: 'unverified' as const,
  confidence: 0,
  reason: 'AI check unavailable, please verify independently',
};

/** Fallback for Filter 2 (Sentiment Check) — assume neutral, no scam concern */
export const FALLBACK_FILTER2 = {
  feelsScam: false,
  sentimentScore: 0,
  publicConcern: 'No data',
};

/** Fallback for Filter 3 (Scam Verification) — safe default, mark as not a scam */
export const FALLBACK_FILTER3 = {
  isScam: false,
  scamType: 'none' as const,
  severity: 'low' as const,
  explanation: 'AI verification unavailable at this time',
};

/** Fallback composite decision when all filters fail */
export const FALLBACK_DECISION = 'reject' as const;
