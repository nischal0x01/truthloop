/**
 * Forecasts module — `scam_forecasts` + `scam_forecast_items` + `forecast_votes`.
 * Owns: the daily Scam Forecast card (one row per day in `scam_forecasts`,
 * 1–3 items per day in `scam_forecast_items`, user votes in `forecast_votes`).
 */
import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  date,
  index,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';
import { severityEnum, forecastVoteEnum, forecastStatusEnum } from './enums';

export const scamForecasts = pgTable('scam_forecasts', {
  id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
  forecastDate: date('forecast_date').notNull().unique(),
  generatedAt: timestamp('generated_at', { withTimezone: true }).notNull().defaultNow(),
  generationStatus: forecastStatusEnum('generation_status').notNull().default('success'),
});

export const scamForecastItems = pgTable(
  'scam_forecast_items',
  {
    id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
    forecastId: uuid('forecast_id')
      .notNull()
      .references(() => scamForecasts.id, { onDelete: 'cascade' }),
    severity: severityEnum('severity').notNull(),
    category: text('category').notNull(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    recommendedAction: text('recommended_action'),
    believeCount: integer('believe_count').notNull().default(0),
    doubtCount: integer('doubt_count').notNull().default(0),
    skipCount: integer('skip_count').notNull().default(0),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    resolutionWasAccurate: boolean('resolution_was_accurate'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('idx_forecast_items_forecast').on(t.forecastId, t.severity)]
);

export const forecastVotes = pgTable(
  'forecast_votes',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    forecastItemId: uuid('forecast_item_id')
      .notNull()
      .references(() => scamForecastItems.id, { onDelete: 'cascade' }),
    vote: forecastVoteEnum('vote').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.forecastItemId] })]
);

export type ScamForecast = typeof scamForecasts.$inferSelect;
export type NewScamForecast = typeof scamForecasts.$inferInsert;
export type ScamForecastItem = typeof scamForecastItems.$inferSelect;
export type NewScamForecastItem = typeof scamForecastItems.$inferInsert;
export type ForecastVote = typeof forecastVotes.$inferSelect;
export type NewForecastVote = typeof forecastVotes.$inferInsert;