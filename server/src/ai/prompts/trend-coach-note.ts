/**
 * prompts/trend-coach-note.ts — prompt builder for the inline Trend Coach Note.
 *
 * Paired with `trendCoachNoteSchema` + `trendCoachNoteFallback` in
 * `../schemas.ts`. Rendered inline below the Trend section h2 in
 * `app/src/pages/WeeklyReport.tsx`.
 *
 * Per `.ai/05-ai-prompts.md` §4 coach-note rules:
 *   - Exactly one sentence, ≤ 28 words.
 *   - Second person ("you"), supportive, never preachy.
 *   - Names the dominant pattern (peak / dip / routine) found in the trend.
 *   - Avoid AI-y clichés and guarantees.
 */

import { wrapUserInputEscaped } from '../safe-input';

export interface TrendCoachNoteInput {
  /** 0..1 — fraction of the user's votes that were correct this period. */
  userAccuracy: number;
  /** 0..1 — fraction of all users' votes correct in this period (or null). */
  globalAverageAccuracy: number | null;
  /** Compact trend points — date + total/correct/accuracy. */
  trendPoints: { day: string; total: number; correct: number; accuracy: number }[];
  /** Period label, e.g. "the last 7 days". */
  periodLabel: string;
}

export interface TrendCoachNoteOptions {
  system: string;
  prompt: string;
  userInput: string;
}

const SYSTEM_PROMPT = [
  'You are the personal media-literacy coach inside TruthLoop, writing the single short observation that appears under the user\'s weekly trend chart.',
  '',
  'Voice rules:',
  '  - One sentence. ≤ 28 words. No lists, no preamble, no closing pleasantries.',
  '  - Second person ("you") — never "the user" or "users".',
  '  - Supportive and matter-of-fact. Never shaming. Never preachy.',
  '  - Anchor on the trend pattern: a peak, a dip, or "steady" if there\'s no clear movement.',
  '  - If the user is well ahead of (or far behind) global accuracy, name the gap in plain language.',
  '  - End with a soft observation ("worth a glance", "tap the bars to look closer") — never a guarantee.',
  '  - Avoid: "always", "never", "obviously", "clearly", clichés, AI-y phrases like "in today\'s world".',
  '',
  'Output the sentence only. No JSON, no labels, no surrounding text.',
].join('\n');

const PROMPT_TEMPLATE = [
  'Write the trend coach note for this user\'s {periodLabel} report.',
  '',
  'Inputs:',
  '{input}',
  '',
  'Return exactly one sentence, ≤ 28 words. No markdown, no JSON wrapper.',
].join('\n');

export function buildTrendCoachNotePrompt(
  input: TrendCoachNoteInput
): TrendCoachNoteOptions {
  // Trim trend points to the first/last/a few — the model needs shape, not volume.
  const trendSummary = input.trendPoints.slice(0, 14).map((p) => ({
    day: p.day,
    total: p.total,
    correct: p.correct,
    accuracy: Math.round(p.accuracy * 100),
  }));
  const summary = {
    period_label: input.periodLabel,
    user_accuracy_pct: Math.round(input.userAccuracy * 100),
    global_accuracy_pct:
      input.globalAverageAccuracy !== null
        ? Math.round(input.globalAverageAccuracy * 100)
        : null,
    trend_points: trendSummary,
    gap_pct:
      input.globalAverageAccuracy !== null
        ? Math.round((input.userAccuracy - input.globalAverageAccuracy) * 100)
        : null,
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

/** Strip incidental fences/bullets/whitespace from the model output. */
export function normalizeTrendCoachNote(sentence: string): { note: string } {
  const cleaned = sentence
    .trim()
    .replace(/^```[\s\S]*?```$/g, '')
    .replace(/^[-*•]\s+/, '')
    .replace(/\s+/g, ' ')
    .trim();
  return { note: cleaned };
}
