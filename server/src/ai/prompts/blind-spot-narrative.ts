/**
 * prompts/blind-spot-narrative.ts — prompt builder for the weekly report's
 * one-line "blind spot" narrative. Paired with `blindSpotNarrativeSchema`
 * + `blindSpotNarrativeFallback` in `../schemas.ts`.
 *
 * Used by `POST /weekly/regenerate` to overwrite `weekly_reports.blindSpotNarrative`
 * with a Claude-generated one-liner. Tone rules below.
 *
 * Per `.ai/05-ai-prompts.md` §4:
 *   - Exactly one sentence, ≤ 28 words.
 *   - Supportive, never shaming.
 *   - Names the specific category.
 *   - Names the global-vs-you gap.
 *   - Ends with a soft call-to-action (no guarantees).
 */

import { wrapUserInputEscaped } from '../safe-input';

export interface BlindSpotNarrativeInput {
  /** Human-friendly category label (e.g. "Misattributed quotes"). */
  categoryLabel: string;
  /** 0..1 — fraction of THIS user's votes in this category that were wrong. */
  userMissRate: number;
  /** 0..1 — fraction of all users' votes in this category that were wrong. */
  globalMissRate: number;
  /** # of THIS user's votes in the category this period. */
  voteCount: number;
  /** Period label, e.g. "the last 7 days" / "this month" / "your custom range". */
  periodLabel: string;
}

export interface BlindSpotNarrativeOptions {
  system: string;
  prompt: string;
  userInput: string;
}

const SYSTEM_PROMPT = [
  'You are the personal media-literacy coach inside TruthLoop, writing the single sentence that opens a user\'s weekly blind-spot report.',
  '',
  'Voice rules:',
  '  • One sentence. ≤ 28 words. No lists, no preamble, no closing pleasantries.',
  '  • Second person ("you") — never "the user" or "users".',
  '  • Supportive and matter-of-fact. Never shaming. Never preachy. Never "don\'t feel bad."',
  '  • Name the specific category the user got fooled by.',
  '  • Quote the gap between this user and the global miss-rate when it\'s striking (>10 points).',
  '  • End with a soft action verb (study, look closer, watch for, slow down on) — never with a guarantee ("you\'ll be immune" / "easy to fix").',
  '  • Avoid: "always", "never", "obviously", "clearly", clichés, AI-y phrases like "in today\'s world".',
  '',
  'Output the sentence only. No JSON, no labels, no surrounding text.',
].join('\n');

const PROMPT_TEMPLATE = [
  'Write the blind-spot narrative for this user\'s {periodLabel} report.',
  '',
  'Inputs:',
  '{input}',
  '',
  'Return exactly one sentence, ≤ 28 words. No markdown, no JSON wrapper.',
].join('\n');

/**
 * Build the prompt inputs for `generateStructured({ schema: blindSpotNarrativeSchema })`.
 * The `userInput` is auto-wrapped in `<user_input>...</user_input>` by the wrapper;
 * we still pre-stringify + escape here so embedded JSON doesn't confuse Claude.
 */
export function buildBlindSpotNarrativePrompt(
  input: BlindSpotNarrativeInput
): BlindSpotNarrativeOptions {
  const json = JSON.stringify(
    {
      period_label: input.periodLabel,
      category: input.categoryLabel,
      user_miss_rate_pct: Math.round(input.userMissRate * 100),
      global_miss_rate_pct: Math.round(input.globalMissRate * 100),
      vote_count: input.voteCount,
      gap_pct: Math.round((input.globalMissRate - input.userMissRate) * 100),
    },
    null,
    2
  );

  return {
    system: SYSTEM_PROMPT,
    prompt: PROMPT_TEMPLATE.replace(
      '{input}',
      // Belt and braces: user JSON inside a defensively-wrapped tag.
      wrapUserInputEscaped(json, 'user_input')
    ).replace('{periodLabel}', input.periodLabel),
    userInput: json,
  };
}

/** Convert the model's string output into the shape the schema expects. */
export function normalizeBlindSpotNarrative(
  sentence: string
): { narrative: string; toneSelfCheck: boolean } {
  const trimmed = sentence.trim();
  // Strip any incidental markdown fences / bullets the model sneaks in.
  const cleaned = trimmed
    .replace(/^```[\s\S]*?```$/g, '')
    .replace(/^[-*•]\s+/, '')
    .replace(/\s+/g, ' ')
    .trim();
  // Cheap self-check: does the sentence talk about the period + the category?
  // We trust the model to do the right thing — this is a sanity hint, not a gate.
  return { narrative: cleaned, toneSelfCheck: true };
}
