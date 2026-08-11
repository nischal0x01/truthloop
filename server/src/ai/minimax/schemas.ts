/**
 * Zod schemas for all MiniMax AI filter outputs.
 * Every AI response is validated against one of these schemas.
 * Invalid responses → fallback to safe defaults (never crash the app).
 */

import { z } from 'zod';

// ─── Filter 1: Truth Check ────────────────────────────────────────────────
export const Filter1TruthSchema = z.object({
  verdict: z.enum(['real', 'fake', 'unverified']),
  confidence: z.number().int().min(0).max(100),
  reason: z.string().min(5).max(500),
});
export type Filter1Truth = z.infer<typeof Filter1TruthSchema>;

// ─── Filter 2: Sentiment Check ────────────────────────────────────────────
export const Filter2SentimentSchema = z.object({
  feelsScam: z.boolean(),
  sentimentScore: z.number().int().min(0).max(100),
  publicConcern: z.string().min(0).max(300),
});
export type Filter2Sentiment = z.infer<typeof Filter2SentimentSchema>;

// ─── Filter 3: Scam Verification ─────────────────────────────────────────
export const Filter3ScamSchema = z.object({
  isScam: z.boolean(),
  scamType: z.enum(['phishing', 'fake_news', 'misleading', 'investment_fraud', 'impersonation', 'none']),
  severity: z.enum(['low', 'medium', 'high']),
  explanation: z.string().min(10).max(500),
});
export type Filter3Scam = z.infer<typeof Filter3ScamSchema>;

// ─── Scraped Claim (input to the pipeline) ────────────────────────────────
export const ScrapedClaimSchema = z.object({
  rawText: z.string().min(10).max(500),
  sourceUrl: z.string().url().optional(),
  sourceName: z.string().min(1).max(50),
  scrapedAt: z.string().datetime(),
});
export type ScrapedClaim = z.infer<typeof ScrapedClaimSchema>;

// ─── Decision output (composite of all 3 filters) ─────────────────────────
export const DiscoveryDecisionSchema = z.enum([
  'publish_as_scam',     // fake + feels like scam + confirmed scam
  'publish_as_misinfo',  // fake but not confirmed scam
  'flag_review',         // uncertain — needs human eye
  'reject',              // real or verified true — not relevant
]);
export type DiscoveryDecision = z.infer<typeof DiscoveryDecisionSchema>;

// ─── AI raw claim discovered + filtered ───────────────────────────────────
export const AiDiscoveredClaimSchema = z.object({
  rawText: z.string(),
  sourceUrl: z.string().url().optional(),
  sourceName: z.string(),
  scrapedAt: z.string().datetime(),

  // Filter 1
  filter1Verdict: z.enum(['real', 'fake', 'unverified']),
  filter1Confidence: z.number().int().min(0).max(100),
  filter1Reason: z.string(),

  // Filter 2
  filter2FeelsScam: z.boolean(),
  filter2SentimentScore: z.number().int().min(0).max(100),
  filter2PublicConcern: z.string(),

  // Filter 3
  filter3IsScam: z.boolean(),
  filter3ScamType: z.string(),
  filter3Severity: z.string(),
  filter3Explanation: z.string(),

  // Decision
  decision: DiscoveryDecisionSchema,
});
export type AiDiscoveredClaim = z.infer<typeof AiDiscoveredClaimSchema>;
