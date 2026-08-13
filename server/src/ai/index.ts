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
  // live fact-check
  factCheckSchema,
} from './schemas';

export type {
  ForecastItem,
  ForecastList,
  ToxicityVerdict,
  FactCheck,
} from './schemas';
