/**
 * AI Claim Discovery — schema for the 3-filter pipeline.
 *
 * Tables:
 *   aiDiscoveredClaims  — individual claims found + filtered by MiniMax
 *   aiScrapeRuns        — history of each scrape job execution
 */
import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  varchar,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { discoveryDecisionEnum, scrapeRunStatusEnum } from './enums.js';

// ─── Scrape runs ─────────────────────────────────────────────────────────────
/**
 * One row per scrape job execution. Useful for debugging, monitoring
 * which sources failed, how many claims were found, etc.
 */
export const aiScrapeRuns = pgTable(
  'ai_scrape_runs',
  {
    id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
    startedAt: timestamp('started_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    sourcesScraped: jsonb('sources_scraped').$type<string[]>().notNull().default([]),
    rawItemsCollected: integer('raw_items_collected').notNull().default(0),
    claimsDiscovered: integer('claims_discovered').notNull().default(0),
    claimsPublished: integer('claims_published').notNull().default(0),
    status: scrapeRunStatusEnum('status').notNull().default('running'),
    errorMessage: text('error_message'),
  },
  (t) => [
    index('idx_scrape_runs_started').on(t.startedAt.desc()),
    index('idx_scrape_runs_status').on(t.status),
  ]
);

// ─── Discovered claims ───────────────────────────────────────────────────────
/**
 * Claims discovered from the web and run through the 3-filter AI pipeline.
 * These are pre-vote staging records — they become `claims` only after
 * passing the pipeline and being published (auto or manual).
 */
export const aiDiscoveredClaims = pgTable(
  'ai_discovered_claims',
  {
    id: uuid('id').primaryKey().default(sql`uuid_generate_v4()`),
    scrapeRunId: uuid('scrape_run_id'),

    // Raw source data
    rawText: text('raw_text').notNull(),
    sourceUrl: text('source_url'),
    sourceName: varchar('source_name', { length: 50 }).notNull(),
    scrapedAt: timestamp('scraped_at', { withTimezone: true }).notNull().defaultNow(),

    // Filter 1: Truth Check
    filter1Verdict: varchar('filter1_verdict', { length: 20 }).notNull(),
    filter1Confidence: integer('filter1_confidence').notNull().default(0),
    filter1Reason: text('filter1_reason'),

    // Filter 2: Sentiment Check
    filter2FeelsScam: boolean('filter2_feels_scam').notNull().default(false),
    filter2SentimentScore: integer('filter2_sentiment_score').notNull().default(0),
    filter2PublicConcern: text('filter2_public_concern'),

    // Filter 3: Scam Verification
    filter3IsScam: boolean('filter3_is_scam').notNull().default(false),
    filter3ScamType: varchar('filter3_scam_type', { length: 30 }).notNull().default('none'),
    filter3Severity: varchar('filter3_severity', { length: 10 }).notNull().default('low'),
    filter3Explanation: text('filter3_explanation'),

    // Composite decision
    decision: discoveryDecisionEnum('decision').notNull().default('reject'),

    // Publishing
    isPublished: boolean('is_published').notNull().default(false),
    publishedClaimId: uuid('published_claim_id'),
    adminFlagged: boolean('admin_flagged').notNull().default(false),
    adminReviewed: boolean('admin_reviewed').notNull().default(false),
    reviewedBy: uuid('reviewed_by'),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),

    // Metadata
    processedAt: timestamp('processed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_discovered_scrape_run').on(t.scrapeRunId),
    index('idx_discovered_decision').on(t.decision),
    index('idx_discovered_published').on(t.isPublished),
    index('idx_discovered_admin_flagged').on(t.adminFlagged),
    uniqueIndex('idx_discovered_dedup').on(t.rawText, t.sourceName),
  ]
);

// ─── Types ───────────────────────────────────────────────────────────────────
export type AiScrapeRun = typeof aiScrapeRuns.$inferSelect;
export type NewAiScrapeRun = typeof aiScrapeRuns.$inferInsert;
export type AiDiscoveredClaim = typeof aiDiscoveredClaims.$inferSelect;
export type NewAiDiscoveredClaim = typeof aiDiscoveredClaims.$inferInsert;
