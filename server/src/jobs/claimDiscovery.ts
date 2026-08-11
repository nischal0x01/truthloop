/**
 * Claim Discovery Job — runs every 2 hours via node-cron.
 *
 * Correct pipeline (per project_context.md):
 *   1. Scrape Reddit/Facebook/Twitter → viral, potentially misleading claims
 *   2. Store as discovered_claims (no verdict yet)
 *   3. Claude checks claim against BBC/CNN/Reuters → verdict + explanation
 *   4. Publish verified claims (real/fake) to claims table
 *   5. Users VOTE → reveal verdict → blind-spot report
 *
 * NO 3 filters. ONE verification call per claim.
 * Max claims per run: 20 (prevents runaway API costs).
 */

import cron from 'node-cron';
import { db } from '@/db/index.js';
import { eq } from 'drizzle-orm';
import { logger } from '@/utils/logger.js';
import { broadcast } from '@/sse/broadcaster.js';
import { scrapeAndProcess } from '@/scraper/index.js';
import { verifyClaim } from '@/ai/claude/verify.js';
import {
  aiScrapeRuns,
  aiDiscoveredClaims,
} from '@/db/schema/ai-discovery.js';
import { claims } from '@/db/schema/claims.js';

// ─── Config ─────────────────────────────────────────────────────────────────
const MAX_CLAIMS_PER_RUN = parseInt(process.env.MAX_CLAIMS_PER_RUN ?? '20', 10);
const CLAIM_SCRAPE_ENABLED = process.env.CLAIM_SCRAPE_ENABLED !== 'false';
const CLAIM_SCRAPE_CRON = process.env.CLAIM_SCRAPE_CRON ?? '*/120 * * * *';

// ─── Publish to claims table ─────────────────────────────────────────────────
async function publishClaim(
  discoveredId: string,
  rawText: string,
  sourceUrl: string | undefined,
  verification: { verdict: string; explanation: string; category: string }
): Promise<string | null> {
  try {
    const [published] = await db
      .insert(claims)
      .values({
        text: rawText,
        verdict: verification.verdict as 'real' | 'fake',
        category: verification.category,
        explanation: verification.explanation,
        sourceUrl: sourceUrl,
        isPublished: true,
        publishedAt: new Date(),
        trendingScore: 1.0,
        voteCount: 0,
      })
      .returning({ id: claims.id });

    if (!published) return null;

    // Mark discovered claim as published
    await db
      .update(aiDiscoveredClaims)
      .set({
        isPublished: true,
        publishedClaimId: published.id,
      })
      .where(eq(aiDiscoveredClaims.id, discoveredId as any));

    return published.id;
  } catch (err) {
    logger.error(`[claim-discovery] Failed to publish claim: ${err}`);
    return null;
  }
}

// ─── Main job ───────────────────────────────────────────────────────────────
let _isRunning = false;

export async function runClaimDiscovery(): Promise<void> {
  if (_isRunning) {
    logger.warn('[claim-discovery] Previous run still in progress, skipping');
    return;
  }
  _isRunning = true;

  const runId = crypto.randomUUID();
  logger.info('[claim-discovery] Starting run...');

  try {
    // Record the run start
    const [runRecord] = await db
      .insert(aiScrapeRuns)
      .values({
        id: runId as any,
        startedAt: new Date(),
        sourcesScraped: [],
        status: 'running',
      })
      .returning();

    // Step 1: Scrape Reddit for viral claims
    const scrapedClaims = await scrapeAndProcess();
    const toProcess = scrapedClaims.slice(0, MAX_CLAIMS_PER_RUN);

    if (toProcess.length === 0) {
      await db
        .update(aiScrapeRuns)
        .set({ completedAt: new Date(), status: 'success', claimsDiscovered: 0 })
        .where(eq(aiScrapeRuns.id, runRecord.id));
      logger.info('[claim-discovery] No claims found in this run');
      return;
    }

    logger.info(`[claim-discovery] Processing ${toProcess.length} claims...`);

    let publishedCount = 0;
    let claimsProcessed = 0;
    const sourcesScraped: string[] = [];

    // Step 2–4: Verify each claim and publish if verified
    for (const scraped of toProcess) {
      try {
        // Verify against trusted sources (BBC, CNN, Reuters, etc.)
        const verification = await verifyClaim(scraped);
        logger.info(`[claim-discovery] Verified "${scraped.rawText.slice(0, 60)}..." → ${verification.verdict} (${verification.confidence}%)`);

        // Store in ai_discovered_claims with verification result
        const [saved] = await db
          .insert(aiDiscoveredClaims)
          .values({
            scrapeRunId: runId as any,
            rawText: scraped.rawText,
            sourceUrl: scraped.sourceUrl,
            sourceName: scraped.sourceName,
            scrapedAt: new Date(scraped.scrapedAt),
            filter1Verdict: verification.verdict,
            filter1Confidence: verification.confidence,
            filter1Reason: verification.explanation,
            filter3Explanation: verification.explanation,
            filter3ScamType: verification.category,
            decision: verification.verdict === 'unverifiable' ? 'reject' : 'publish_as_misinfo',
            isPublished: false,
            processedAt: new Date(),
          })
          .returning();

        claimsProcessed++;

        // Publish to claims table if verified (real or fake, not unverifiable)
        if (verification.verdict !== 'unverifiable') {
          const publishedId = await publishClaim(
            saved.id,
            scraped.rawText,
            scraped.sourceUrl,
            verification
          );

          if (publishedId) {
            publishedCount++;
            broadcast('new-claim', { id: publishedId, text: scraped.rawText });
            sourcesScraped.push(scraped.sourceName);
          }
        }

        // Delay between claims to avoid rate limits
        await new Promise((r) => setTimeout(r, 500));
      } catch (err) {
        logger.error(`[claim-discovery] Failed to process claim: ${err}`);
      }
    }

    // Mark run complete
    await db
      .update(aiScrapeRuns)
      .set({
        completedAt: new Date(),
        sourcesScraped,
        rawItemsCollected: scrapedClaims.length,
        claimsDiscovered: claimsProcessed,
        claimsPublished: publishedCount,
        status: 'success',
      })
      .where(eq(aiScrapeRuns.id, runRecord.id));

    logger.info(
      `[claim-discovery] Run complete: ${claimsProcessed} verified, ${publishedCount} published`
    );
  } catch (err) {
    logger.error(`[claim-discovery] Run failed: ${err}`);

    await db
      .update(aiScrapeRuns)
      .set({
        completedAt: new Date(),
        status: 'failed',
        errorMessage: err instanceof Error ? err.message : String(err),
      })
      .where(eq(aiScrapeRuns.id, runId));
  } finally {
    _isRunning = false;
  }
}

// ─── Cron scheduler ──────────────────────────────────────────────────────────
let _cronTask: ReturnType<typeof cron.schedule> | null = null;

export function startClaimDiscoveryCron(): void {
  if (!CLAIM_SCRAPE_ENABLED) {
    logger.info('[claim-discovery] Cron disabled via CLAIM_SCRAPE_ENABLED=false');
    return;
  }

  if (_cronTask) {
    _cronTask.stop();
  }

  _cronTask = cron.schedule(CLAIM_SCRAPE_CRON, async () => {
    await runClaimDiscovery();
  }, {
    timezone: process.env.CRON_TIMEZONE ?? 'UTC',
  });

  logger.info(`[claim-discovery] Cron scheduled: ${CLAIM_SCRAPE_CRON}`);
}

export function stopClaimDiscoveryCron(): void {
  _cronTask?.stop();
  _cronTask = null;
}
