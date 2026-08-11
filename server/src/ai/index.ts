/**
 * AI barrel — all AI exports from a single import.
 *
 * Usage:
 *   import { verifyClaim, callScamForecast, callToxicity, callWeeklyNarrative } from '@/ai';
 */
export { verifyClaim, type ClaimVerification } from './claude/verify.js';
export { callScamForecast, SCAM_FORECAST_FALLBACK, ForecastArraySchema, type ForecastItem, type ForecastArray } from './prompts/scamForecast.js';
export { callToxicity, TOXICITY_FALLBACK, ToxicitySchema, type ToxicityResult } from './prompts/toxicity.js';
export { callWeeklyNarrative, NARRATIVE_FALLBACK, NarrativeSchema, type NarrativeResult } from './prompts/weeklyNarrative.js';
export { AIError } from './prompts/client.js';
export * from './minimax/errors.js';
