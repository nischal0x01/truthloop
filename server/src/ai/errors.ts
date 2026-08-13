/**
 * errors.ts — typed errors from the AI wrapper.
 *
 * Distinguishes three failure modes so the route layer can decide:
 *  - AIServiceError(cause: 'config')  → fatal, do not retry (missing key, bad model)
 *  - AIServiceError(cause: 'parse')   → spec violation in model output (already retried)
 *  - AIServiceError(cause: 'upstream') → Anthropic 5xx/429 (already retried with backoff)
 *
 * Routes surface these as `AppError(502, 'AI service unavailable.')` so the
 * frontend can render a useful fallback rather than a hard crash.
 */

export type AIErrorCause = 'config' | 'parse' | 'upstream' | 'unknown';

export class AIServiceError extends Error {
  readonly cause: AIErrorCause;
  readonly status?: number;
  readonly retryable: boolean;

  constructor(
    message: string,
    options: { cause: AIErrorCause; status?: number; retryable?: boolean; original?: unknown } = {}
  ) {
    super(message);
    this.name = 'AIServiceError';
    this.cause = options.cause;
    this.status = options.status;
    this.retryable = options.retryable ?? false;
    // Preserve original stack if available.
    if (options.original instanceof Error) {
      this.stack = options.original.stack ?? this.stack;
    }
  }
}
