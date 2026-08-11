/**
 * Tests for scamForecast prompt and schema.
 */
import { describe, it, expect } from 'vitest';
import {
  ForecastItemSchema,
  ForecastArraySchema,
  SCAM_FORECAST_FALLBACK,
  scamForecastUserPrompt,
} from './scamForecast.js';

describe('ForecastItemSchema', () => {
  it('parses a valid forecast item', () => {
    const valid = {
      severity: 'high',
      category: 'upi_festival_scam',
      title: 'Festival-season UPI refund scams expected in Kerala',
      description:
        'Scammers send fake UPI refund messages during festival season, impersonating delivery services.',
      recommended_action: 'Never click UPI refund links from unknown senders.',
    };
    expect(ForecastItemSchema.parse(valid)).toEqual(valid);
  });

  it('rejects invalid severity', () => {
    const invalid = {
      severity: 'critical', // must be low | medium | high
      category: 'fake_news',
      title: 'This is a test title for the claim',
      description: 'A valid description for the scam forecast item.',
      recommended_action: 'Verify before acting.',
    };
    expect(() => ForecastItemSchema.parse(invalid)).toThrow();
  });

  it('rejects title that is too short', () => {
    const invalid = {
      severity: 'low',
      category: 'scam',
      title: 'Ab', // min 6 chars — "Ab" is only 2 chars
      description: 'A valid description for the scam forecast item.',
      recommended_action: 'Verify before acting.',
    };
    expect(() => ForecastItemSchema.parse(invalid)).toThrow();
  });

  it('rejects description that is too short', () => {
    const invalid = {
      severity: 'low',
      category: 'scam',
      title: 'A valid title for the claim here',
      description: 'Too short', // min 20 chars
      recommended_action: 'Verify before acting.',
    };
    expect(() => ForecastItemSchema.parse(invalid)).toThrow();
  });

  it('rejects recommended_action that is too short', () => {
    const invalid = {
      severity: 'low',
      category: 'scam',
      title: 'A valid title for the claim here',
      description: 'A valid description that is long enough to pass the check.',
      recommended_action: 'Short', // min 10 chars
    };
    expect(() => ForecastItemSchema.parse(invalid)).toThrow();
  });
});

describe('ForecastArraySchema', () => {
  it('parses array of 1–3 items', () => {
    const valid = [
      {
        severity: 'high',
        category: 'crypto_airdrop_phishing',
        title: 'Crypto airdrop phishing surge expected',
        description: 'Phishing campaigns impersonating crypto airdrops are expected to spike.',
        recommended_action: 'Never connect your wallet to unverified sites.',
      },
    ];
    expect(ForecastArraySchema.parse(valid)).toEqual(valid);
  });

  it('rejects empty array', () => {
    expect(() => ForecastArraySchema.parse([])).toThrow();
  });

  it('rejects array with 4 items (max 3)', () => {
    const four = [
      {
        severity: 'low', category: 'a', title: 'A valid title here',
        description: 'A valid description that passes the check.', recommended_action: 'Verify first.',
      },
      {
        severity: 'low', category: 'b', title: 'B valid title here',
        description: 'A valid description that passes the check.', recommended_action: 'Verify first.',
      },
      {
        severity: 'low', category: 'c', title: 'C valid title here',
        description: 'A valid description that passes the check.', recommended_action: 'Verify first.',
      },
      {
        severity: 'low', category: 'd', title: 'D valid title here',
        description: 'A valid description that passes the check.', recommended_action: 'Verify first.',
      },
    ];
    expect(() => ForecastArraySchema.parse(four)).toThrow();
  });
});

describe('SCAM_FORECAST_FALLBACK', () => {
  it('is a valid ForecastArray', () => {
    expect(() => ForecastArraySchema.parse(SCAM_FORECAST_FALLBACK)).not.toThrow();
  });

  it('has exactly 1 item', () => {
    expect(SCAM_FORECAST_FALLBACK).toHaveLength(1);
  });

  it('has low severity in fallback', () => {
    expect(SCAM_FORECAST_FALLBACK[0].severity).toBe('low');
  });
});

describe('scamForecastUserPrompt', () => {
  it('includes today date in prompt', () => {
    const prompt = scamForecastUserPrompt(
      '2026-08-11',
      ['Headline 1', 'Headline 2'],
      ['Pattern 1'],
      'global'
    );
    expect(prompt).toContain('2026-08-11');
    expect(prompt).toContain('global');
    expect(prompt).toContain('Headline 1');
    expect(prompt).toContain('Pattern 1');
  });

  it('wraps content in <user_input> tags', () => {
    const prompt = scamForecastUserPrompt(
      '2026-08-11',
      ['Headline 1'],
      ['Pattern 1'],
      'south-asia'
    );
    expect(prompt).toContain('<user_input>');
    expect(prompt).toContain('</user_input>');
  });

  it('handles empty headlines and patterns', () => {
    const prompt = scamForecastUserPrompt('2026-08-11', [], [], 'global');
    expect(prompt).toContain('<user_input>');
    expect(prompt).toContain('global');
  });
});
