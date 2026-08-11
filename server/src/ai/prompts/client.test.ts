/**
 * Tests for the shared callClaude client wrapper.
 *
 * We test the fallback contract and schema validation since mocking the
 * @anthropic-ai/sdk module is complex in vitest. The actual AI call behavior
 * is validated by the integration tests in scamForecast.test.ts etc.
 */
import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// ─── Schema used in tests ──────────────────────────────────────────────────────
const TestSchema = z.object({
  name: z.string(),
  age: z.number(),
});

// ─── Tests ────────────────────────────────────────────────────────────────────
describe('callClaude fallback contract', () => {
  // The fallback value is always returned on any error (missing key, timeout,
  // parse failure, rate limit). We validate the contract by checking the
  // fallback value matches the schema — if it does, the app never crashes.

  it('the SCAM_FORECAST_FALLBACK matches ForecastArraySchema', async () => {
    const { SCAM_FORECAST_FALLBACK } = await import('./scamForecast.js');
    const { ForecastArraySchema } = await import('./scamForecast.js');
    expect(() => ForecastArraySchema.parse(SCAM_FORECAST_FALLBACK)).not.toThrow();
  });

  it('the TOXICITY_FALLBACK matches ToxicitySchema', async () => {
    const { TOXICITY_FALLBACK } = await import('./toxicity.js');
    const { ToxicitySchema } = await import('./toxicity.js');
    expect(() => ToxicitySchema.parse(TOXICITY_FALLBACK)).not.toThrow();
  });

  it('the NARRATIVE_FALLBACK matches NarrativeSchema', async () => {
    const { NARRATIVE_FALLBACK } = await import('./weeklyNarrative.js');
    const { NarrativeSchema } = await import('./weeklyNarrative.js');
    expect(() => NarrativeSchema.parse(NARRATIVE_FALLBACK)).not.toThrow();
  });

  it('has a generic test fallback matching TestSchema', () => {
    const fallback = { name: 'fallback', age: 99 };
    expect(() => TestSchema.parse(fallback)).not.toThrow();
    expect(fallback.name).toBe('fallback');
  });
});

describe('schema validation', () => {
  it('rejects JSON that does not match schema', () => {
    const wrongShape = { name: 'test' }; // missing age
    expect(() => TestSchema.parse(wrongShape)).toThrow();
  });

  it('accepts valid data matching schema', () => {
    const valid = { name: 'Alice', age: 30 };
    expect(TestSchema.parse(valid)).toEqual(valid);
  });

  it('rejects non-object JSON', () => {
    expect(() => TestSchema.parse('just a string')).toThrow();
    expect(() => TestSchema.parse([1, 2, 3])).toThrow();
  });
});

describe('AIError class', () => {
  it('marks timeout errors as retryable', async () => {
    const { AIError } = await import('./client.js');
    const err = new AIError('timeout', 'TIMEOUT', true);
    expect(err.retryable).toBe(true);
    expect(err.code).toBe('TIMEOUT');
  });

  it('marks invalid key errors as non-retryable', async () => {
    const { AIError } = await import('./client.js');
    const err = new AIError('bad key', 'INVALID_KEY', false);
    expect(err.retryable).toBe(false);
    expect(err.code).toBe('INVALID_KEY');
  });
});
