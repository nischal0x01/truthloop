/**
 * Tests for toxicity filter prompt and schema.
 */
import { describe, it, expect } from 'vitest';
import {
  ToxicitySchema,
  TOXICITY_FALLBACK,
  toxicityUserPrompt,
} from './toxicity.js';

describe('ToxicitySchema', () => {
  it('parses a benign comment (score 0.0)', () => {
    const valid = {
      score: 0.0,
      reasons: [],
      action: 'accept',
    };
    expect(ToxicitySchema.parse(valid)).toEqual(valid);
  });

  it('parses a borderline comment (score 0.5)', () => {
    const valid = {
      score: 0.55,
      reasons: ['personal_attack'],
      action: 'flag',
    };
    expect(ToxicitySchema.parse(valid)).toEqual(valid);
  });

  it('parses a toxic comment (score 0.9)', () => {
    const valid = {
      score: 0.9,
      reasons: ['slur', 'harassment'],
      action: 'reject',
    };
    expect(ToxicitySchema.parse(valid)).toEqual(valid);
  });

  it('rejects score > 1', () => {
    const invalid = { score: 1.5, reasons: [], action: 'accept' };
    expect(() => ToxicitySchema.parse(invalid)).toThrow();
  });

  it('rejects score < 0', () => {
    const invalid = { score: -0.1, reasons: [], action: 'accept' };
    expect(() => ToxicitySchema.parse(invalid)).toThrow();
  });

  it('rejects invalid action', () => {
    const invalid = { score: 0.5, reasons: [], action: 'ban' };
    expect(() => ToxicitySchema.parse(invalid)).toThrow();
  });

  it('rejects more than 3 reasons', () => {
    const invalid = {
      score: 0.8,
      reasons: ['a', 'b', 'c', 'd'],
      action: 'reject',
    };
    expect(() => ToxicitySchema.parse(invalid)).toThrow();
  });

  it('accepts up to 3 reasons', () => {
    const valid = {
      score: 0.8,
      reasons: ['slur', 'threat', 'harassment'],
      action: 'reject',
    };
    expect(ToxicitySchema.parse(valid)).toEqual(valid);
  });
});

describe('TOXICITY_FALLBACK', () => {
  it('is a valid ToxicityResult', () => {
    expect(() => ToxicitySchema.parse(TOXICITY_FALLBACK)).not.toThrow();
  });

  it('defaults to accept action', () => {
    expect(TOXICITY_FALLBACK.action).toBe('accept');
  });

  it('has a low score in fallback (optimistic — accept in doubt)', () => {
    expect(TOXICITY_FALLBACK.score).toBeLessThan(0.5);
  });

  it('has no reasons in fallback', () => {
    expect(TOXICITY_FALLBACK.reasons).toHaveLength(0);
  });
});

describe('toxicityUserPrompt', () => {
  it('wraps body in <user_input> tags', () => {
    const prompt = toxicityUserPrompt('This is a test comment');
    expect(prompt).toContain('<user_input>');
    expect(prompt).toContain('This is a test comment');
    expect(prompt).toContain('</user_input>');
  });

  it('handles multi-line comments', () => {
    const body = 'Line one\nLine two\nLine three';
    const prompt = toxicityUserPrompt(body);
    expect(prompt).toContain(body);
  });

  it('handles empty string', () => {
    const prompt = toxicityUserPrompt('');
    expect(prompt).toContain('<user_input>');
    expect(prompt).toContain('</user_input>');
  });
});
