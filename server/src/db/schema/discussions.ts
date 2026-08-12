/**
 * Discussions module — `discussions` + `discussion_votes` + `discussion_comments` + `discussion_comment_votes`.
 * Standalone forum posts separate from claim comments.
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

export const discussions = pgTable(
  'discussions',
  {
    id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    body: text('body').notNull(),
    imageUrl: text('image_url'),
    upvotes: integer('upvotes').notNull().default(0),
    downvotes: integer('downvotes').notNull().default(0),
    commentCount: integer('comment_count').notNull().default(0),
    isDeleted: boolean('is_deleted').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_discussions_user').on(t.userId),
    index('idx_discussions_created').on(t.createdAt.desc()),
    check('discussions_title_length', sql`char_length(${t.title}) <= 300 AND char_length(${t.title}) > 0`),
    check('discussions_body_length', sql`char_length(${t.body}) <= 2000 AND char_length(${t.body}) > 0`),
  ]
);

export const discussionVotes = pgTable(
  'discussion_votes',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    discussionId: uuid('discussion_id')
      .notNull()
      .references(() => discussions.id, { onDelete: 'cascade' }),
    vote: smallint('vote').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.discussionId] }),
    index('idx_discussion_votes_discussion').on(t.discussionId),
    check('discussion_votes_range', sql`${t.vote} IN (-1, 1)`),
  ]
);

export const discussionComments = pgTable(
  'discussion_comments',
  {
    id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
    discussionId: uuid('discussion_id')
      .notNull()
      .references(() => discussions.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    parentCommentId: uuid('parent_comment_id').references(
      (): AnyPgColumn => discussionComments.id,
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
  },
  (t) => [
    index('idx_discussion_comments_discussion_created')
      .on(t.discussionId, t.createdAt.desc()),
    index('idx_discussion_comments_parent')
      .on(t.parentCommentId)
      .where(sql`${t.parentCommentId} IS NOT NULL`),
    index('idx_discussion_comments_user').on(t.userId),
    check(
      'discussion_comments_body_length',
      sql`char_length(${t.body}) <= 2000 AND char_length(${t.body}) > 0`
    ),
  ]
);

export const discussionCommentVotes = pgTable(
  'discussion_comment_votes',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    commentId: uuid('comment_id')
      .notNull()
      .references(() => discussionComments.id, { onDelete: 'cascade' }),
    vote: smallint('vote').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.commentId] }),
    index('idx_discussion_comment_votes_comment').on(t.commentId),
    check('discussion_comment_votes_range', sql`${t.vote} IN (-1, 1)`),
  ]
);

export type Discussion = typeof discussions.$inferSelect;
export type NewDiscussion = typeof discussions.$inferInsert;
export type DiscussionVote = typeof discussionVotes.$inferSelect;
export type NewDiscussionVote = typeof discussionVotes.$inferInsert;
export type DiscussionComment = typeof discussionComments.$inferSelect;
export type NewDiscussionComment = typeof discussionComments.$inferInsert;
export type DiscussionCommentVote = typeof discussionCommentVotes.$inferSelect;
export type NewDiscussionCommentVote = typeof discussionCommentVotes.$inferInsert;
