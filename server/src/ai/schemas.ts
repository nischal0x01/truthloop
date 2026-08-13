/**
 * schemas.ts — Zod schemas for AI prompt outputs.
 *
 * Each prompt template under `prompts/` registers a Zod schema here so
 * that `generateStructured({ schema })` can validate model output before
 * it reaches the route handler. Adding a new prompt? Add the schema,
 * then import from `@/ai`.
 *
 * Per `.ai/05-ai-prompts.md` §6, every prompt must declare a fallback
 * response. Fallbacks live in this file too, paired by suffix:
 * `blindSpotNarrativeFallback` → used by `prompts/blind-spot-narrative.ts`.
 */

import { z } from 'zod';

/* ── Common primitives ─────────────────────────────────────────────── */

export const categorySlug = z.enum([
  'factual_statement',
  'outdated_info',
  'misleading_omission',
  'manipulated_stat',
  'misattributed_quote',
  'satire_mistaken_as_real',
  'survey_stat',
  'conspiracy_theory',
  'misattributed_threat',
  'unverified_claim',
]);

/** Severity bucket for `/forecast` items. */
export const severityLevel = z.enum(['low', 'medium', 'high', 'critical']);

/** Verdict — used by `submit`-tab fact-check and AI re-judgement flows. */
export const verdictLevel = z.enum(['real', 'fake', 'mixed', 'unverified']);

/* ── 1. Scam forecast (`.ai/05-ai-prompts.md` §1) ───────────────────── */

export const forecastItemSchema = z.object({
  title: z.string().min(8).max(140),
  summary: z.string().min(20).max(500),
  severity: severityLevel,
  category: categorySlug,
  /** ISO 3166-1 alpha-2 country code, or 'GLOBAL'. */
  region: z.string().min(2).max(32),
  pattern: z.string().min(20).max(400),
  sourceHint: z.string().min(2).max(120).optional(),
});
export type ForecastItem = z.infer<typeof forecastItemSchema>;

export const forecastListSchema = z.object({
  generatedForDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  items: z.array(forecastItemSchema).min(1).max(8),
});
export type ForecastList = z.infer<typeof forecastListSchema>;

export const forecastFallback: ForecastList = {
  generatedForDate: new Date().toISOString().slice(0, 10),
  items: [
    {
      title: 'Coordinated outage hoax on a popular payment app',
      summary:
        'A wave of posts claims that a major payment app is "down" and asks users to forward verification codes to a support line. Outage confirmation channels show no such incident.',
      severity: 'high',
      category: 'conspiracy_theory',
      region: 'GLOBAL',
      pattern:
        'Reports of inexplicable service outages are a common phishing pretext — they exploit the urgency of "verify before you lose access."',
    },
    {
      title: 'AI-generated celebrity health claim circulating on socials',
      summary:
        'A short video uses a deepfake voice clone to claim a public figure endorsed a supplement. The figure has publicly denied involvement and the original clip was tracked to a spoof channel.',
      severity: 'medium',
      category: 'misattributed_quote',
      region: 'US',
      pattern:
        'Voice-cloned endorsements exploit our trust in familiar voices. Always verify through the figure\'s official channel.',
    },
  ],
};

/* ── 3. Toxicity moderator (`.ai/05-ai-prompts.md` §3) ─────────────── */

export const toxicityVerdictSchema = z.object({
  decision: z.enum(['allow', 'block', 'soften']),
  reason: z.string().min(1).max(240),
  /** Optional rewrite that's still on-topic but kinder; surfaced to composer. */
  softened: z.string().max(500).optional(),
});
export type ToxicityVerdict = z.infer<typeof toxicityVerdictSchema>;

export const toxicityFallback: ToxicityVerdict = {
  decision: 'allow',
  reason: 'AI moderation unavailable — defaulting to allow with reviewer queue.',
};

/* ── 4. Blind-spot narrative (`.ai/05-ai-prompts.md` §4) ───────────── */

export const blindSpotNarrativeSchema = z.object({
  narrative: z.string().min(40).max(280),
  toneSelfCheck: z.boolean(),
});

export const blindSpotNarrativeFallback = {
  narrative:
    "You missed a noticeable share of one category this period — that's the pattern worth studying. Read the replay claim below for the breakdown.",
  toneSelfCheck: true,
};

/* ── 5. Live fact-check (`.ai/05-ai-prompts.md` §5) ────────────────── */

export const factCheckSchema = z.object({
  verdict: verdictLevel,
  /** 0..1 — Claude's stated confidence. Surfaced verbatim to the user. */
  confidence: z.number().min(0).max(1),
  /** ≤2 sentences for the main verdict chip. */
  headline: z.string().min(10).max(180),
  /** Up to 4 supporting reasons, each a single sentence. */
  reasons: z.array(z.string().min(8).max(180)).min(1).max(4),
  /** Up to 3 URLs the model would direct the user to verify against. */
  sources: z
    .array(
      z.object({
        url: z.string().url(),
        title: z.string().min(2).max(120),
      })
    )
    .max(3)
    .optional(),
});
export type FactCheck = z.infer<typeof factCheckSchema>;
