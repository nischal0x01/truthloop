/**
 * Users module — `users` + `user_settings`.
 * Owns: identity, auth, points/streaks, notification preferences.
 */
import { pgTable, uuid, text, integer, boolean, timestamp, date, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    email: text('email').notNull().unique(),
    displayName: text('display_name').notNull(),
    avatarUrl: text('avatar_url'),
    googleId: text('google_id').unique(),
    // Dev-only convenience — remove when JWT-only auth lands in Phase 2.
    passwordHash: text('password_hash'),
    points: integer('points').notNull().default(0),
    streakDays: integer('streak_days').notNull().default(0),
    lastActiveDate: date('last_active_date'),
    isAdmin: boolean('is_admin').notNull().default(false),
    emailBounced: boolean('email_bounced').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_users_points').on(t.points.desc()),
    index('idx_users_google_id').on(t.googleId),
  ]
);

export const userSettings = pgTable('user_settings', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  emailDigestEnabled: boolean('email_digest_enabled').notNull().default(true),
  emailInstantAlertsEnabled: boolean('email_instant_alerts_enabled')
    .notNull()
    .default(true),
  emailDigestHourLocal: integer('email_digest_hour_local').notNull().default(8),
  timezone: text('timezone').notNull().default('UTC'),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type UserSettings = typeof userSettings.$inferSelect;
export type NewUserSettings = typeof userSettings.$inferInsert;