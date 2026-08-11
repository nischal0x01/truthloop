/**
 * Tests for weekly narrative prompt and schema.
 */
import { describe, it, expect } from 'vitest';
import {
  NarrativeSchema,
  NARRATIVE_FALLBACK,
  narrativeUserPrompt,
  type WeeklyNarrativeInput,
} from './weeklyNarrative.js';

describe('NarrativeSchema', () => {
  it('parses a valid narrative result', () => {
    const valid = {
      narrative: 'You are most often fooled by manipulated statistics, but you are strong at identifying misattributed quotes.',
      tone_check: 'ok',
    };
    expect(NarrativeSchema.parse(valid)).toEqual(valid);
  });

  it('rejects narrative that is too short', () => {
    const invalid = {
      narrative: 'Too short.', // min 20 chars
      tone_check: 'ok',
    };
    expect(() => NarrativeSchema.parse(invalid)).toThrow();
  });

  it('rejects narrative that is too long', () => {
    const invalid = {
      narrative: 'A'.repeat(201), // max 200 chars
      tone_check: 'ok',
    };
    expect(() => NarrativeSchema.parse(invalid)).toThrow();
  });

  it('rejects invalid tone_check', () => {
    const invalid = {
      narrative: 'You are most often fooled by manipulated statistics.',
      tone_check: 'maybe', // must be ok | revise
    };
    expect(() => NarrativeSchema.parse(invalid)).toThrow();
  });

  it('accepts tone_check revise (for human review)', () => {
    const valid = {
      narrative: 'You are most often fooled by manipulated statistics.',
      tone_check: 'revise',
    };
    expect(NarrativeSchema.parse(valid)).toEqual(valid);
  });
});

describe('NARRATIVE_FALLBACK', () => {
  it('is a valid NarrativeResult', () => {
    expect(() => NarrativeSchema.parse(NARRATIVE_FALLBACK)).not.toThrow();
  });

  it('has tone_check ok', () => {
    expect(NARRATIVE_FALLBACK.tone_check).toBe('ok');
  });

  it('has narrative >= 20 chars', () => {
    expect(NARRATIVE_FALLBACK.narrative.length).toBeGreaterThanOrEqual(20);
  });
});

describe('narrativeUserPrompt', () => {
  const baseInput: WeeklyNarrativeInput = {
    userAccuracy: 0.75,
    userBlindSpotCategory: 'manipulated_stat',
    userBlindSpotCategoryHuman: 'manipulated statistics',
    categoryBreakdown: {
      manipulated_stat: 4,
      outdated_info: 2,
      factual_statement: 1,
    },
    globalAverageAccuracy: 0.68,
    userTopMissedClaims: [
      {
        text: 'A misleading statistic about employment rates.',
        category: 'manipulated_stat',
        userAnswer: 'real',
        verdict: 'fake',
      },
    ],
    userTopCorrectCategories: ['misattributed_quote', 'satire_mistaken_as_real'],
  };

  it('includes user accuracy percentage', () => {
    const prompt = narrativeUserPrompt(baseInput);
    expect(prompt).toContain('75%'); // 0.75 → 75%
  });

  it('includes global average accuracy', () => {
    const prompt = narrativeUserPrompt(baseInput);
    expect(prompt).toContain('68%'); // 0.68 → 68%
  });

  it('includes blind spot category in human-readable form', () => {
    const prompt = narrativeUserPrompt(baseInput);
    expect(prompt).toContain('manipulated statistics');
  });

  it('includes category breakdown', () => {
    const prompt = narrativeUserPrompt(baseInput);
    expect(prompt).toContain('manipulated_stat');
    expect(prompt).toContain('4 wrong');
    expect(prompt).toContain('outdated_info');
    expect(prompt).toContain('2 wrong');
  });

  it('includes top correct categories', () => {
    const prompt = narrativeUserPrompt(baseInput);
    expect(prompt).toContain('misattributed_quote');
    expect(prompt).toContain('satire_mistaken_as_real');
  });

  it('includes missed claim text and verdict', () => {
    const prompt = narrativeUserPrompt(baseInput);
    expect(prompt).toContain('A misleading statistic');
    expect(prompt).toContain('manipulated_stat');
    expect(prompt).toContain('guessed real');
    expect(prompt).toContain('was fake');
  });

  it('wraps content in <user_input> tags', () => {
    const prompt = narrativeUserPrompt(baseInput);
    expect(prompt).toContain('<user_input>');
    expect(prompt).toContain('</user_input>');
  });

  it('handles empty top missed claims', () => {
    const input = { ...baseInput, userTopMissedClaims: [] };
    const prompt = narrativeUserPrompt(input);
    expect(prompt).toContain('<user_input>');
    // should not throw
    expect(() => narrativeUserPrompt(input)).not.toThrow();
  });

  it('handles empty top correct categories', () => {
    const input = { ...baseInput, userTopCorrectCategories: [] };
    expect(() => narrativeUserPrompt(input)).not.toThrow();
  });

  it('handles empty category breakdown (no wrong guesses)', () => {
    const input = { ...baseInput, categoryBreakdown: {} };
    const prompt = narrativeUserPrompt(input);
    expect(prompt).toContain('<user_input>');
    // Breakdown section exists but has no entries (no "X wrong" lines)
    expect(prompt).toContain('Category breakdown of wrong guesses:');
    // No individual category lines appear when breakdown is empty
    expect(prompt).not.toMatch(/- .+: [1-9] wrong/);
  });
});
