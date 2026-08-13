/**
 * prompts/replay-coach-note.ts — prompt builder for the inline Replay Coach
 * Note (a one-liner that points out the structural tell behind the replay
 * claim the user got wrong this period).
 *
 * Paired with `replayCoachNoteSchema` + `replayCoachNoteFallback` in
 * `../schemas.ts`. Rendered inline below the Replay section h2.
 *
 * Per `.ai/05-ai-prompts.md` §4 coach-note rules:
 *   - Exactly one sentence, ≤ 30 words.
 *   - Supportive, never rubs the wrong-vote in.
 *   - Names the structural feature (source citation, framing, omission, etc.)
 *     that, if caught next time, would have flipped the verdict.
 *   - No guarantees.
 */

import { wrapUserInputEscaped } from '../safe-input';

export interface ReplayCoachNoteInput {
  /** The claim text — the model is told to treat this as data via the
   *  `<user_input>` guard, never as instructions. */
  claimText: string;
  /** Category label (e.g. "Misattributed quotes"). */
  categoryLabel: string;
  /** Server-side verdict ('real' / 'fake'). */
  verdict: 'real' | 'fake';
  /** Optional human-written explanation already on the claim row. */
  explanation: string | null;
  /** Period label, e.g. "the last 7 days". */
  periodLabel: string;
}

export interface ReplayCoachNoteOptions {
  system: string;
  prompt: string;
  userInput: string;
}

const SYSTEM_PROMPT = [
  'You are the personal media-literacy coach inside TruthLoop, writing a single short observation that appears under the "claim worth a second look" panel.',
  '',
  'Voice rules:',
  '  - One sentence. ≤ 30 words. No lists, no preamble, no closing pleasantries.',
  '  - Second person ("you").',
  '  - Frame it as "look for this tell next time" — never "you should have caught…".',
  '  - Focus on one structural feature (source citation, framing, omission, attribution, sensational wording).',
  '  - Keep it useful: a concrete cue the user can apply to other claims.',
  '  - Avoid: "always", "never", "obviously", "clearly", "stupid", "foolish".',
  '',
  'Output the sentence only. No JSON, no labels, no surrounding text.',
].join('\n');

const PROMPT_TEMPLATE = [
  'Write the replay coach note for this user\'s {periodLabel} report.',
  '',
  'Inputs:',
  '{input}',
  '',
  'Return exactly one sentence, ≤ 30 words. No markdown, no JSON wrapper.',
].join('\n');

export function buildReplayCoachNotePrompt(
  input: ReplayCoachNoteInput
): ReplayCoachNoteOptions {
  const summary = {
    period_label: input.periodLabel,
    claim_text: input.claimText,
    category: input.categoryLabel,
    truth: input.verdict,
    server_explanation: input.explanation ?? null,
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

export function normalizeReplayCoachNote(sentence: string): { note: string } {
  const cleaned = sentence
    .trim()
    .replace(/^```[\s\S]*?```$/g, '')
    .replace(/^[-*•]\s+/, '')
    .replace(/\s+/g, ' ')
    .trim();
  return { note: cleaned };
}
