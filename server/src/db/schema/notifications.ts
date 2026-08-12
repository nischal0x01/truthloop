/**
 * Notifications module — `notifications`.
 * Owns: the in-app bell icon feed (read/unread, JSONB metadata).
 * Email delivery is separate (Resend) and lives in `server/src/email/`.
 */
import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';
import { notificationTypeEnum } from './enums';

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: notificationTypeEnum('type').notNull(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    link: text('link'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    isRead: boolean('is_read').notNull().default(false),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Partial index — bell-icon unread count is the hot read path.
    index('idx_notifications_user_unread')
      .on(t.userId, t.createdAt.desc())
      .where(sql`${t.isRead} = false`),
  ]
);

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;