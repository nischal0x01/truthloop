/**
 * Scam Forecast Generation — daily AI-generated scam predictions.
 *
 * Spec: .ai/05-ai-prompts.md §1
 * Model: claude-sonnet-4-5
 * Schedule: daily cron at 06:00 UTC
 */

import { z } from 'zod';
import { callClaude } from './client.js';

// ─── Schema ───────────────────────────────────────────────────────────────────
export const ForecastItemSchema = z.object({
  severity: z.enum(['low', 'medium', 'high']),
  category: z.string().min(3).max(50),
  title: z.string().min(6).max(120),
  description: z.string().min(20).max(500),
  recommended_action: z.string().min(10).max(200),
});
export const ForecastArraySchema = z.array(ForecastItemSchema).min(1).max(3);

export type ForecastItem = z.infer<typeof ForecastItemSchema>;
export type ForecastArray = z.infer<typeof ForecastArraySchema>;

// ─── Fallback ─────────────────────────────────────────────────────────────────
export const SCAM_FORECAST_FALLBACK: ForecastArray = [
  {
    severity: 'low',
    category: 'general_vigilance',
    title: 'Stay vigilant against social engineering',
    description:
      'Scammers constantly adapt their tactics. Be cautious of unsolicited messages asking for personal information or urgent action.',
    recommended_action:
      'Verify any unsolicited request through an independent channel before responding.',
  },
];

// ─── System prompt ─────────────────────────────────────────────────────────────
const SCAM_FORECAST_SYSTEM = `You are a cybersecurity analyst who specializes in predicting social-engineering scams.

Given today's date, a list of recent news headlines, and a list of recently reported scam
patterns, generate 1 to 3 scam forecasts for the next 7 days.

For each forecast, return a JSON object with these exact fields:
  - severity: one of "low" | "medium" | "high"
  - category: a short snake_case slug (e.g. "upi_festival_scam", "fake_airline_refund",
    "crypto_airdrop_phishing", "deepfake_video_call", "job_offer_scam", "romance_scam",
    "fake_charity", "loan_app_scam")
  - title: a 6-12 word headline (e.g. "Festival-season UPI refund scams expected in Kerala")
  - description: a 2-3 sentence explanation of how the scam will likely work
  - recommended_action: 1 sentence telling users what to watch for

Constraints:
- Ground every forecast in the provided headlines or recent scam patterns. Do not invent
  plausible-sounding trends that have no signal in the input.
- If the input is too thin to support any forecast, return an array with one item:
  { severity: "low", category: "general_vigilance", title: "Stay vigilant against social
  engineering", description: "Scammers constantly adapt...", recommended_action: "Verify
  any unsolicited request through an independent channel." }
- Output a single JSON array, no prose, no markdown fences.`;

// ─── User prompt ────────────────────────────────────────────────────────────────
export function scamForecastUserPrompt(
  today: string,
  recentHeadlines: string[],
  recentScamPatterns: string[],
  region: string
): string {
  const headlines = recentHeadlines.map((h) => `- ${h}`).join('\n');
  const patterns = recentScamPatterns.map((p) => `- ${p}`).join('\n');
  return `<user_input>
Today: ${today}
Region: ${region}

Recent headlines (last 48h):
${headlines}

Recently reported scam patterns (last 7 days):
${patterns}
</user_input>

Return the JSON array of forecasts.`;
}

// ─── Input type ────────────────────────────────────────────────────────────────
export interface ScamForecastInput {
  today: string;
  recentHeadlines: string[];
  recentScamPatterns: string[];
  region: string;
}

// ─── Caller ────────────────────────────────────────────────────────────────────
export async function callScamForecast(input: ScamForecastInput): Promise<ForecastArray> {
  const { today, recentHeadlines, recentScamPatterns, region } = input;
  const userPrompt = scamForecastUserPrompt(today, recentHeadlines, recentScamPatterns, region);

  return callClaude({
    system: SCAM_FORECAST_SYSTEM,
    user: userPrompt,
    schema: ForecastArraySchema,
    defaultModel: 'claude-sonnet-4-5',
    maxTokens: 1024,
    fallback: SCAM_FORECAST_FALLBACK,
  });
}
