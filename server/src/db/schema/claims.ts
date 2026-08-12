/**
 * Claims module — `claims` + `guesses`.
 * Owns: the voting loop. UNIQUE(user_id, claim_id) on `guesses` enforces the
 * one-vote-locked rule.
 */
import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  real,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';
import { verdictEnum } from './enums';

export const claims = pgTable(
  'claims',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    text: text('text').notNull(),
    verdict: verdictEnum('verdict').notNull(),
    category: text('category').notNull(),
    explanation: text('explanation').notNull(),
    sourceUrl: text('source_url'),
    isPublished: boolean('is_published').notNull().default(true),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    trendingScore: real('trending_score').notNull().default(0),
    voteCount: integer('vote_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_claims_published_trending').on(
      t.isPublished,
      t.trendingScore.desc(),
      t.publishedAt.desc()
    ),
  ]
);

export const guesses = pgTable(
  'guesses',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    claimId: uuid('claim_id')
      .notNull()
      .references(() => claims.id, { onDelete: 'cascade' }),
    userAnswer: verdictEnum('user_answer').notNull(),
    isCorrect: boolean('is_correct').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // One-vote-locked rule.
    uniqueIndex('guesses_user_claim_unique').on(t.userId, t.claimId),
    index('idx_guesses_user_created').on(t.userId, t.createdAt.desc()),
    index('idx_guesses_claim').on(t.claimId),
  ]
);

export type Claim = typeof claims.$inferSelect;
export type NewClaim = typeof claims.$inferInsert;
export type Guess = typeof guesses.$inferSelect;
export type NewGuess = typeof guesses.$inferInsert;