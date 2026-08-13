/**
 * ai/index.ts — public re-exports for the AI module.
 *
 * Routes import from `@/ai` and get the full surface:
 *   import { generateStructured, blindSpotNarrativeSchema, ... } from '@/ai';
 */

export { generateText, generateStructured, DEFAULT_MODEL, STRONG_MODEL, aiStatus } from './client';
export type { GenerateTextOptions, GenerateStructuredOptions } from './client';

export { AIServiceError } from './errors';

export { wrapUserInput, wrapUserInputEscaped } from './safe-input';

export {
  // primitives
  categorySlug,
  severityLevel,
  verdictLevel,
  // forecast
  forecastItemSchema,
  forecastListSchema,
  forecastFallback,
  // toxicity
  toxicityVerdictSchema,
  toxicityFallback,
  // blind-spot narrative
  blindSpotNarrativeSchema,
  blindSpotNarrativeFallback,
  // weekly coach notes (§4.1–4.4)
  trendCoachNoteSchema,
  trendCoachNoteFallback,
  blindSpotContextSchema,
  blindSpotContextFallback,
  replayCoachNoteSchema,
  replayCoachNoteFallback,
  prescriptionSchema,
  prescriptionFallback,
  // live fact-check
  factCheckSchema,
  factCheckFallback,
} from './schemas';

export type {
  ForecastItem,
  ForecastList,
  ToxicityVerdict,
  TrendCoachNote,
  BlindSpotContext,
  ReplayCoachNote,
  Prescription,
  FactCheck,
} from './schemas';

export {
  buildTrendCoachNotePrompt,
  normalizeTrendCoachNote,
} from './prompts/trend-coach-note';
export {
  buildBlindSpotContextPrompt,
  normalizeBlindSpotContext,
} from './prompts/blind-spot-context';
export {
  buildReplayCoachNotePrompt,
  normalizeReplayCoachNote,
} from './prompts/replay-coach-note';
export {
  buildPrescriptionPrompt,
  normalizePrescription,
} from './prompts/prescription';
export { buildScamForecastPrompt } from './prompts/scam-forecast';
export { buildLiveFactCheckPrompt } from './prompts/live-fact-check';
