/**
 * prompts/blind-spot-context.ts — prompt builder for the inline Blind-Spot
 * Coach Note. Distinct from the headline `blindSpotNarrative` (which lives in
 * its own large blockquote); this one sits directly under the section h2.
 *
 * Paired with `blindSpotContextSchema` + `blindSpotContextFallback` in
 * `../schemas.ts`.
 *
 * Per `.ai/05-ai-prompts.md` §4 coach-note rules:
 *   - Exactly one sentence, ≤ 28 words.
 *   - Names the category. Explains what makes it structurally tricky.
 *   - Supportive tone — never blames the user for missing it.
 */

import { wrapUserInputEscaped } from '../safe-input';

export interface BlindSpotContextInput {
  /** Human-friendly category label (e.g. "Misattributed quotes"). */
  categoryLabel: string;
  /** 0..1 — fraction of THIS user's votes in this category that were wrong. */
  userMissRate: number;
  /** 0..1 — fraction of all users' votes in this category that were wrong. */
  globalMissRate: number;
  /** # of THIS user's votes in the category this period. */
  voteCount: number;
  /** Period label, e.g. "the last 7 days". */
  periodLabel: string;
}

export interface BlindSpotContextOptions {
  system: string;
  prompt: string;
  userInput: string;
}

const SYSTEM_PROMPT = [
  'You are the personal media-literacy coach inside TruthLoop, writing a single short context line that appears under the user\'s blind-spot category heading.',
  '',
  'Voice rules:',
  '  - One sentence. ≤ 28 words. No lists, no preamble, no closing pleasantries.',
  '  - Second person ("you").',
  '  - Name the category the user keeps missing.',
  '  - Describe what makes the category structurally tricky — framing, omission, attribution, source citation, etc. — without blaming the reader.',
  '  - Optionally name the gap to global miss-rate when it is striking (>10 points).',
  '  - End with a soft action ("slowing down on…", "double-checking the source…", "watching for…") — never a guarantee.',
  '  - Avoid: "always", "never", "obviously", "clearly", "you should", "you must".',
  '',
  'Output the sentence only. No JSON, no labels, no surrounding text.',
].join('\n');

const PROMPT_TEMPLATE = [
  'Write the blind-spot context line for this user\'s {periodLabel} report.',
  '',
  'Inputs:',
  '{input}',
  '',
  'Return exactly one sentence, ≤ 28 words. No markdown, no JSON wrapper.',
].join('\n');

export function buildBlindSpotContextPrompt(
  input: BlindSpotContextInput
): BlindSpotContextOptions {
  const summary = {
    period_label: input.periodLabel,
    category: input.categoryLabel,
    user_miss_rate_pct: Math.round(input.userMissRate * 100),
    global_miss_rate_pct: Math.round(input.globalMissRate * 100),
    vote_count: input.voteCount,
    gap_pct: Math.round((input.globalMissRate - input.userMissRate) * 100),
  };
  const json = JSON.stringify(summary, null, 2);

  return {
    system: SYSTEM_PROMPT,
    prompt: PROMPT_TEMPLATE.replace('{periodLabel}', input.periodLabel).replace(
      '{input}',
      wrapUserInputEscaped(json, 'user_input')
    ),
    userInput: json,
  };
}

export function normalizeBlindSpotContext(sentence: string): { note: string } {
  const cleaned = sentence
    .trim()
    .replace(/^```[\s\S]*?```$/g, '')
    .replace(/^[-*•]\s+/, '')
    .replace(/\s+/g, ' ')
    .trim();
  return { note: cleaned };
}
