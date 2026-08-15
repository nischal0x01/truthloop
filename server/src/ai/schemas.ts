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

/** Verdict — used by `submit`-tab fact-check and AI re-judgement flows.
 *  `mixed` is reserved for future use; the current spec (§2) only ships
 *  `real` | `fake` | `unverifiable`. We expose `unverified` here as the
 *  friendly alias and map it onto the DB enum (`ai_verdict`) at persist time. */
export const verdictLevel = z.enum(['real', 'fake', 'unverified']);

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
  /** Verbatim URL of the <search_results> entry this forecast was grounded in. */
  sourceUrl: z.string().url().optional(),
  /** Verbatim title of that entry. */
  sourceTitle: z.string().min(2).max(200).optional(),
});
export type ForecastItem = z.infer<typeof forecastItemSchema>;

export const forecastListSchema = z.object({
  generatedForDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  items: z.array(forecastItemSchema).min(1).max(8),
});
export type ForecastList = z.infer<typeof forecastListSchema>;

export const forecastFallback: ForecastList = {
  generatedForDate: new Date().toISOString().slice(0, 10),
  // sourceUrl / sourceTitle intentionally omitted — fallback fires when search is
  // unavailable AND Claude is down, so there's no grounded article to cite.
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

/* ── 4.1–4.4 Weekly coach notes (per-section inline + closing prescription) ──
 *
 * Four short, supportive one-liners rendered across the Weekly Blind-Spot
 * report:
 *   - `trendCoachNote`            → under the Trend section h2
 *   - `blindSpotContext`          → under the Blind-spot section h2
 *                                    (the existing `blindSpotNarrative` blockquote
 *                                     above stays as the headline statement)
 *   - `replayCoachNote`           → under the Replay section h2
 *   - `prescription`              → closing card above FooterActions
 *
 * Each is generated in parallel inside `/weekly/regenerate` via
 * `generateStructured({ schema, fallback })` so an AI outage on one never
 * blocks the others. Fallbacks are pre-written supportive strings.
 */

/** Trend observation — looks at peaks/dips/routine in the user's daily accuracy. */
export const trendCoachNoteSchema = z.object({
  note: z.string().min(20).max(180),
});
export type TrendCoachNote = z.infer<typeof trendCoachNoteSchema>;

export const trendCoachNoteFallback: TrendCoachNote = {
  note:
    'Steady week — your accuracy held within a tight band. Tap the trend bars below to compare the daily counts.',
};

/** Blind-spot context — explains what makes the user's worst category structurally tricky. */
export const blindSpotContextSchema = z.object({
  note: z.string().min(20).max(180),
});
export type BlindSpotContext = z.infer<typeof blindSpotContextSchema>;

export const blindSpotContextFallback: BlindSpotContext = {
  note:
    'This category tends to fool people who read fast. Slowing down on the headline alone is half the win.',
};

/** Replay insight — points out the structural tell behind the replay claim. */
export const replayCoachNoteSchema = z.object({
  note: z.string().min(20).max(200),
});
export type ReplayCoachNote = z.infer<typeof replayCoachNoteSchema>;

export const replayCoachNoteFallback: ReplayCoachNote = {
  note:
    'Look at how the source is cited — missing or circular sourcing is the most common tell for claims like this.',
};

/** Closing prescription — one concrete next-week micro-habit. */
export const prescriptionSchema = z.object({
  note: z.string().min(20).max(220),
});
export type Prescription = z.infer<typeof prescriptionSchema>;

export const prescriptionFallback: Prescription = {
  note:
    "Pick one category this week and read two articles about how it gets made. Pattern recognition scales faster than rules.",
};

/* ── 5. Live fact-check (`.ai/05-ai-prompts.md` §2) ────────────────── */

export const factCheckSchema = z.object({
  verdict: verdictLevel,
  /** 0..100 — Claude's stated confidence (per spec, NOT 0..1). */
  confidence: z.number().int().min(0).max(100),
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
  /** One of the category slugs from `categorySlug`. */
  category: categorySlug,
});
export type FactCheck = z.infer<typeof factCheckSchema>;

/** Hard fallback when Claude is down or returns garbage. Spec §6. */
export const factCheckFallback: FactCheck = {
  verdict: 'unverified',
  confidence: 0,
  headline: 'AI check unavailable — try again in a moment.',
  reasons: ['Our fact-check service did not respond. Your submission was saved and can be re-checked later.'],
  category: 'unverified_claim',
};

/* ── 6. Claim harvest (`.ai/05-ai-prompts.md` §6 — hourly cron) ─────────
 *
 * Output of the hourly claim-harvester cron
 * (server/src/jobs/claimHarvester.ts): Claude returns a small batch of
 * already-extracted + verified claims, each shaped exactly like a FactCheck
 * plus a `trendSignal` 0–100 used to seed the row's trending_score.
 *
 * The job then filters (drops unverified, low-confidence, and duplicates)
 * and persists whatever survives. Empty `items: []` is a valid result —
 * it just means the job logged "no fresh claims this hour" and exits.
 */
export const harvestBatchSchema = z.object({
  items: z
    .array(
      z.object({
        text: z.string().min(20).max(280),
        verdict: verdictLevel,
        confidence: z.number().int().min(0).max(100),
        headline: z.string().min(10).max(180),
        reasons: z.array(z.string().min(8).max(180)).min(1).max(4),
        sources: z
          .array(
            z.object({
              url: z.string().url(),
              title: z.string().min(2).max(120),
            })
          )
          .max(3)
          .optional(),
        category: categorySlug,
        trendSignal: z.number().int().min(0).max(100).optional(),
      })
    )
    .max(5),
});
export type HarvestBatch = z.infer<typeof harvestBatchSchema>;

/**
 * Hard fallback when Claude is down or returns garbage. Returning an EMPTY
 * items array (not a fabricated claim) is the only safe behaviour here —
 * the job MUST NOT insert unverified / hallucinated content.
 */
export const harvestBatchFallback: HarvestBatch = { items: [] };
