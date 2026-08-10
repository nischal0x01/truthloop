/**
 * Gamification module — `badges` + `user_badges`.
 * Owns: the 8 badge definitions + the (user, badge) earned table.
 * Badge triggers fire from the app layer (see `server/src/gamification/`).
 */
import { pgTable, uuid, text, timestamp, primaryKey } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';
import { rarityEnum } from './enums';

export const badges = pgTable('badges', {
  slug: text('slug').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  icon: text('icon').notNull(),
  rarity: rarityEnum('rarity').notNull().default('common'),
});

export const userBadges = pgTable(
  'user_badges',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    badgeSlug: text('badge_slug')
      .notNull()
      .references(() => badges.slug, { onDelete: 'cascade' }),
    earnedAt: timestamp('earned_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.badgeSlug] })]
);

export type Badge = typeof badges.$inferSelect;
export type NewBadge = typeof badges.$inferInsert;
export type UserBadge = typeof userBadges.$inferSelect;
export type NewUserBadge = typeof userBadges.$inferInsert;