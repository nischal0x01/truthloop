/**
 * Reports module — `weekly_reports`.
 * Owns: the Sunday-cron-generated blind-spot report per user per week.
 * UNIQUE(user_id, week_starting) — one report per user per week.
 */
import {
  pgTable,
  uuid,
  text,
  integer,
  real,
  date,
  timestamp,
  index,
  uniqueIndex,
  jsonb,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';
import { claims } from './claims';

/**
 * Shape of the `coach_notes` JSONB column on `weekly_reports`.
 * Mirrors `WeeklyReportCoachNotes` in `app/src/actions/reports.ts` so the
 * server can persist & read it without importing from the client workspace.
 */
export interface WeeklyCoachNotes {
  trend?: string | null;
  blindSpot?: string | null;
  replay?: string | null;
  prescription?: string | null;
}

export const weeklyReports = pgTable(
  'weekly_reports',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    weekStarting: date('week_starting').notNull(),
    totalGuesses: integer('total_guesses').notNull().default(0),
    correctGuesses: integer('correct_guesses').notNull().default(0),
    blindSpotCategory: text('blind_spot_category'),
    blindSpotNarrative: text('blind_spot_narrative'),
    replayClaimId: uuid('replay_claim_id').references(() => claims.id, {
      onDelete: 'set null',
    }),
    globalAverageAccuracy: real('global_average_accuracy'),
    userAccuracy: real('user_accuracy'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    coachNotes: jsonb('coach_notes').$type<WeeklyCoachNotes | null>(),
  },
  (t) => [
    uniqueIndex('weekly_reports_user_week_unique').on(t.userId, t.weekStarting),
    index('idx_weekly_reports_user').on(t.userId, t.weekStarting.desc()),
  ]
);

export type WeeklyReport = typeof weeklyReports.$inferSelect;
export type NewWeeklyReport = typeof weeklyReports.$inferInsert;