/**
 * prompts/prescription.ts — prompt builder for the closing "Coach's
 * prescription" card on the Weekly Blind-Spot report.
 *
 * Paired with `prescriptionSchema` + `prescriptionFallback` in `../schemas.ts`.
 *
 * This note is the closing actionable moment of the report — one concrete
 * micro-habit the user can try next week. It sees a wider input set
 * (blend of trend, blind-spot context, replay insight, full category
 * breakdown) so it can synthesize the others into a single prescription.
 *
 * Per `.ai/05-ai-prompts.md` §4:
 *   - Exactly one sentence, ≤ 32 words.
 *   - Supportive, never preachy, no guarantees.
 *   - One concrete habit, not a list.
 *   - Ends on a soft action verb.
 */

import { wrapUserInputEscaped } from '../safe-input';

export interface PrescriptionInput {
  /** Category label of the user's blind spot (or null). */
  blindSpotCategoryLabel: string | null;
  /** The headline blind-spot narrative string (or null). */
  blindSpotNarrative: string | null;
  /** All category buckets this period so the model can pick a concrete focus. */
  categoryBreakdown: {
    category: string;
    total: number;
    correct: number;
    accuracy: number;
  }[];
  /** Period label, e.g. "the last 7 days". */
  periodLabel: string;
}

export interface PrescriptionOptions {
  system: string;
  prompt: string;
  userInput: string;
}

const SYSTEM_PROMPT = [
  'You are the personal media-literacy coach inside TruthLoop, writing the single sentence that closes a user\'s weekly blind-spot report. This is the actionable moment — one concrete habit they can try next week.',
  '',
  'Voice rules:',
  '  - One sentence. ≤ 32 words. No lists, no preamble, no closing pleasantries.',
  '  - Second person ("you").',
  '  - Supportive and matter-of-fact. Never preachy. Never shame. Never promise outcomes.',
  '  - One concrete habit — a single small action, not a philosophy. Examples of good habits: "paste the quote into a search box", "look at the photo metadata before sharing", "read the comments before the post".',
  '  - Anchor the habit to the user\'s actual pattern (their worst category, or a generalizable cue from their category breakdown).',
  '  - End on a soft action verb ("try", "pause", "look once more", "slow down on", "read once more").',
  '  - Avoid: "always", "never", "obviously", "clearly", AI-y phrases like "in today\'s world", guarantees like "you will be immune".',
  '',
  'Output the sentence only. No JSON, no labels, no surrounding text.',
].join('\n');

const PROMPT_TEMPLATE = [
  'Write the coach\'s prescription for this user\'s {periodLabel} report.',
  '',
  'Inputs:',
  '{input}',
  '',
  'Return exactly one sentence, ≤ 32 words. No markdown, no JSON wrapper.',
].join('\n');

export function buildPrescriptionPrompt(
  input: PrescriptionInput
): PrescriptionOptions {
  const summary = {
    period_label: input.periodLabel,
    blind_spot_category: input.blindSpotCategoryLabel,
    blind_spot_narrative: input.blindSpotNarrative,
    category_breakdown: input.categoryBreakdown.map((r) => ({
      category: r.category,
      total: r.total,
      correct: r.correct,
      accuracy_pct: Math.round(r.accuracy * 100),
    })),
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

export function normalizePrescription(sentence: string): { note: string } {
  const cleaned = sentence
    .trim()
    .replace(/^```[\s\S]*?```$/g, '')
    .replace(/^[-*•]\s+/, '')
    .replace(/\s+/g, ' ')
    .trim();
  return { note: cleaned };
}
