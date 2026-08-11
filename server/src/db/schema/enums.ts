/**
 * Schema enums — all `pgEnum` definitions live here so they can be shared
 * across tables without circular imports.
 *
 * Each enum mirrors a CHECK constraint in `server/src/db/schema.sql`.
 * Add a new enum here, then reference it from the table that needs it.
 */
import { pgEnum } from 'drizzle-orm/pg-core';

/** Verdict of a claim (or a user's guess on that claim). */
export const verdictEnum = pgEnum('verdict', ['real', 'fake']);

/** Verdict of an AI live fact-check on a user-submitted claim. */
export const aiVerdictEnum = pgEnum('ai_verdict', ['real', 'fake', 'unverified']);

/** Severity of a scam forecast item. */
export const severityEnum = pgEnum('severity', ['low', 'medium', 'high']);

/** A user's vote on a scam forecast item. */
export const forecastVoteEnum = pgEnum('forecast_vote', ['believe', 'doubt', 'skip']);

/** Badge rarity tiers. */
export const rarityEnum = pgEnum('rarity', ['common', 'rare', 'epic', 'legendary']);

/** In-app notification types. */
export const notificationTypeEnum = pgEnum('notification_type', [
  'new_claim',
  'reply_to_comment',
  'new_scam_forecast',
  'weekly_report_ready',
  'badge_earned',
  'leaderboard_rank_up',
]);

/** Scam forecast generation status (success / fell back to default / failed). */
export const forecastStatusEnum = pgEnum('forecast_status', [
  'success',
  'fallback',
  'failed',
]);

/** Composite decision from the 3-filter AI pipeline. */
export const discoveryDecisionEnum = pgEnum('discovery_decision', [
  'publish_as_scam',     // fake + feels like scam + confirmed scam
  'publish_as_misinfo',  // fake but not confirmed scam
  'flag_review',         // uncertain — needs human review
  'reject',              // real or verified true — not relevant
]);

/** Status of an AI scrape run. */
export const scrapeRunStatusEnum = pgEnum('scrape_run_status', [
  'running',
  'success',
  'partial',   // some sources failed
  'failed',
]);