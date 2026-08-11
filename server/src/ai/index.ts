/**
 * AI barrel — all AI exports from a single import.
 *
 * Usage:
 *   import { filter1TruthCheck, filter2SentimentCheck, filter3ScamVerification } from '@/ai';
 */
export {
  filter1TruthCheck,
  filter2SentimentCheck,
  filter3ScamVerification,
} from './minimax/client.js';
export { makeDecision } from './minimax/prompts.js';
export * from './minimax/schemas.js';
export * from './minimax/errors.js';
