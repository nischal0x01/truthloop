/**
 * Comments module — `comments` + `comment_votes`.
 * Owns: Reddit-style nested discussion. `parent_comment_id` is a self-ref
 * for unlimited nesting depth (visually collapse beyond 5 in the UI).
 */
import {
  pgTable,
  uuid,
  text,
  integer,
  real,
  boolean,
  timestamp,
  smallint,
  primaryKey,
  index,
  check,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';
import { claims } from './claims';

export const comments = pgTable(
  'comments',
  {
    id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
    claimId: uuid('claim_id')
      .notNull()
      .references(() => claims.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    parentCommentId: uuid('parent_comment_id').references(
      (): AnyPgColumn => comments.id,
      { onDelete: 'cascade' }
    ),
    body: text('body').notNull(),
    toxicityScore: real('toxicity_score'),
    isFlagged: boolean('is_flagged').notNull().default(false),
    isDeleted: boolean('is_deleted').notNull().default(false),
    upvotes: integer('upvotes').notNull().default(0),
    downvotes: integer('downvotes').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    index('idx_comments_claim_created').on(t.claimId, t.createdAt.desc()),
    index('idx_comments_parent')
      .on(t.parentCommentId)
      .where(sql`${t.parentCommentId} IS NOT NULL`),
    index('idx_comments_user').on(t.userId),
    check(
      'comments_body_length',
      sql`char_length(${t.body}) <= 2000 AND char_length(${t.body}) > 0`
    ),
  ]
);

export const commentVotes = pgTable(
  'comment_votes',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    commentId: uuid('comment_id')
      .notNull()
      .references(() => comments.id, { onDelete: 'cascade' }),
    vote: smallint('vote').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.commentId] }),
    index('idx_comment_votes_comment').on(t.commentId),
    check('comment_votes_range', sql`${t.vote} IN (-1, 1)`),
  ]
);

export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
export type CommentVote = typeof commentVotes.$inferSelect;
export type NewCommentVote = typeof commentVotes.$inferInsert;