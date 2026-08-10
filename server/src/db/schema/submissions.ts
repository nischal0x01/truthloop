/**
 * Submissions module — `user_submissions`.
 * Owns: the Submit-a-Claim tab (live AI fact-check flow).
 * Submissions never enter the main claim feed — see `.ai/02-business-logic.md` §2.5.
 */
import {
  pgTable,
  uuid,
  text,
  boolean,
  smallint,
  timestamp,
  jsonb,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';
import { aiVerdictEnum } from './enums';

export const userSubmissions = pgTable(
  'user_submissions',
  {
    id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    text: text('text').notNull(),
    aiVerdict: aiVerdictEnum('ai_verdict'),
    aiConfidence: smallint('ai_confidence'),
    aiExplanation: text('ai_explanation'),
    aiSources: jsonb('ai_sources').$type<
      Array<{ url: string; title: string; snippet?: string }>
    >(),
    aiCategory: text('ai_category'),
    isToxic: boolean('is_toxic').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_submissions_user').on(t.userId, t.createdAt.desc()),
    check(
      'submissions_text_length',
      sql`char_length(${t.text}) > 0 AND char_length(${t.text}) <= 1000`
    ),
    check(
      'submissions_confidence_range',
      sql`${t.aiConfidence} BETWEEN 0 AND 100`
    ),
  ]
);

export type UserSubmission = typeof userSubmissions.$inferSelect;
export type NewUserSubmission = typeof userSubmissions.$inferInsert;