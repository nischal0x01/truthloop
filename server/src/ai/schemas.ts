/**
 * All Zod schemas for AI prompt inputs and outputs.
 *
 * Conventions (per .ai/05-ai-prompts.md):
 * - Every schema is named {Feature}{Direction}Schema (e.g. ForecastItemSchema)
 * - Array schemas wrap single-item schemas
 * - Fallback values are exported alongside schemas
 */

import { z } from 'zod';

// ════════════════════════════════════════════════════════════════════════════════
// §1 — Scam Forecast
// ════════════════════════════════════════════════════════════════════════════════

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

// ════════════════════════════════════════════════════════════════════════════════
// §2 — Live AI Fact-Check
// ════════════════════════════════════════════════════════════════════════════════

export const FactCheckSourceSchema = z.object({
  url: z.string().url(),
  title: z.string().min(5).max(200),
  snippet: z.string().max(200),
});

export const FactCheckSchema = z.object({
  verdict: z.enum(['real', 'fake', 'unverifiable']),
  confidence: z.number().int().min(0).max(100),
  explanation: z.string().min(20).max(800),
  sources: z.array(FactCheckSourceSchema).max(3),
  category: z.string(),
});

export type FactCheckResult = z.infer<typeof FactCheckSchema>;

// ════════════════════════════════════════════════════════════════════════════════
// §3 — Comment Toxicity Filter
// ════════════════════════════════════════════════════════════════════════════════

export const ToxicitySchema = z.object({
  score: z.number().min(0).max(1),
  reasons: z.array(z.string()).max(3),
  action: z.enum(['accept', 'flag', 'reject']),
});

export type ToxicityResult = z.infer<typeof ToxicitySchema>;

// ════════════════════════════════════════════════════════════════════════════════
// §4 — Weekly Blind-Spot Narrative
// ════════════════════════════════════════════════════════════════════════════════

export const NarrativeSchema = z.object({
  narrative: z.string().min(20).max(200),
  tone_check: z.enum(['ok', 'revise']),
});

export type NarrativeResult = z.infer<typeof NarrativeSchema>;
