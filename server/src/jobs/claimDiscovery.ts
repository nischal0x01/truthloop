/**
 * Claim Discovery Job — runs every 2 hours via node-cron.
 *
 * Pipeline:
 *   1. Scrape web sources (RSS feeds) → raw headlines
 *   2. Normalize + deduplicate → ScrapedClaim[]
 *   3. For each claim: run 3 MiniMax filters sequentially
 *   4. Make composite decision (app code, deterministic)
 *   5. Store in ai_discovered_claims
 *   6. Auto-publish: publish_as_scam + publish_as_misinfo → create a `claims` row
 *   7. Flag: flag_review → mark adminFlagged=true for human review
 *   8. Broadcast SSE event for new claims
 *
 * Concurrency: processes claims sequentially to avoid MiniMax rate limits.
 * Max claims per run: 20 (prevents runaway costs).
 */

import cron from 'node-cron';
import { db, schema } from '@/db/index.js';
import { eq } from 'drizzle-orm';
import { logger } from '@/utils/logger.js';
import { broadcast } from '@/sse/broadcaster.js';
import { scrapeAndProcess } from '@/scraper/index.js';
import {
  filter1TruthCheck,
  filter2SentimentCheck,
  filter3ScamVerification,
} from '@/ai/minimax/client.js';
import { makeDecision } from '@/ai/minimax/prompts.js';
import {
  aiScrapeRuns,
  aiDiscoveredClaims,
  type NewAiDiscoveredClaim,
} from '@/db/schema/ai-discovery.js';
import { claims } from '@/db/schema/claims.js';

// ─── Config ─────────────────────────────────────────────────────────────────
const MAX_CLAIMS_PER_RUN = parseInt(process.env.MAX_CLAIMS_PER_RUN ?? '20', 10);
const CLAIM_SCRAPE_ENABLED = process.env.CLAIM_SCRAPE_ENABLED !== 'false';
const CLAIM_SCRAPE_CRON = process.env.CLAIM_SCRAPE_CRON ?? '*/120 * * * *'; // every 2h

// ─── Category mapping ────────────────────────────────────────────────────────
/** Maps scam type strings to claim categories (from business logic). */
function mapScamTypeToCategory(scamType: string): string {
  const map: Record<string, string> = {
    phishing: 'unverified_claim',
    fake_news: 'misleading_omission',
    misleading: 'misleading_omission',
    investment_fraud: 'conspiracy_theory',
    impersonation: 'misattributed_threat',
    none: 'unverified_claim',
  };
  return map[scamType] ?? 'unverified_claim';
}

// ─── Single claim pipeline ───────────────────────────────────────────────────
async function processClaim(
  scraped: { rawText: string; sourceUrl?: string; sourceName: string; scrapedAt: string },
  runId: string
): Promise<NewAiDiscoveredClaim> {
  // Filter 1: Truth check
  const f1 = await filter1TruthCheck({
    rawText: scraped.rawText,
    sourceName: scraped.sourceName,
    sourceUrl: scraped.sourceUrl,
  });

  // Filter 2: Sentiment check (takes f1 result as context)
  const f2 = await filter2SentimentCheck(
    { rawText: scraped.rawText, sourceName: scraped.sourceName },
    f1
  );

  // Filter 3: Scam verification (takes f1 + f2 as context)
  const f3 = await filter3ScamVerification(
    { rawText: scraped.rawText, sourceName: scraped.sourceName },
    f1,
    f2
  );

  // Decision: deterministic app code
  const decision = makeDecision(f1, f2, f3);

  return {
    scrapeRunId: runId as any,
    rawText: scraped.rawText,
    sourceUrl: scraped.sourceUrl,
    sourceName: scraped.sourceName,
    scrapedAt: new Date(scraped.scrapedAt),
    filter1Verdict: f1.verdict,
    filter1Confidence: f1.confidence,
    filter1Reason: f1.reason,
    filter2FeelsScam: f2.feelsScam,
    filter2SentimentScore: f2.sentimentScore,
    filter2PublicConcern: f2.publicConcern,
    filter3IsScam: f3.isScam,
    filter3ScamType: f3.scamType,
    filter3Severity: f3.severity,
    filter3Explanation: f3.explanation,
    decision,
    isPublished: false,
    adminFlagged: decision === 'flag_review',
    processedAt: new Date(),
  };
}

// ─── Publish to claims table ─────────────────────────────────────────────────
async function publishClaim(
  discovered: NewAiDiscoveredClaim
): Promise<string | null> {
  try {
    const [published] = await db
      .insert(claims)
      .values({
        text: discovered.rawText,
        verdict: discovered.filter1Verdict === 'real' ? 'real' : 'fake',
        category: mapScamTypeToCategory(discovered.filter3ScamType ?? 'none'),
        explanation: discovered.filter3Explanation ?? discovered.filter1Reason ?? 'AI-verified claim from web discovery.',
        sourceUrl: discovered.sourceUrl,
        isPublished: true,
        publishedAt: new Date(),
        trendingScore: 1.0, // starts at 1.0, decays over time
        voteCount: 0,
      })
      .returning({ id: claims.id });

    return published?.id ?? null;
  } catch (err) {
    logger.error(`[claim-discovery] Failed to publish claim: ${err}`);
    return null;
  }
}

// ─── Main job ────────────────────────────────────────────────────────────────
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

    // Step 1: Scrape
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

    // Step 2–6: Process each claim sequentially (avoid MiniMax rate limits)
    for (const scraped of toProcess) {
      try {
        const discovered = await processClaim(scraped, runId);

        // Step 7: Store in ai_discovered_claims
        const [saved] = await db
          .insert(aiDiscoveredClaims)
          .values(discovered as any)
          .returning();

        // Step 8: Auto-publish if decision says so
        if (
          discovered.decision === 'publish_as_scam' ||
          discovered.decision === 'publish_as_misinfo'
        ) {
          const publishedId = await publishClaim(discovered);

          if (publishedId) {
            await db
              .update(aiDiscoveredClaims)
              .set({ isPublished: true, publishedClaimId: publishedId as any })
              .where(eq(aiDiscoveredClaims.id, saved.id));

            publishedCount++;

            // Broadcast new claim to all connected SSE clients
            broadcast('new-claim', { id: publishedId, text: discovered.rawText });
          }
        }

        claimsProcessed++;

        // Small delay between claims to avoid hitting MiniMax rate limits
        await new Promise((r) => setTimeout(r, 500));
      } catch (err) {
        logger.error(`[claim-discovery] Failed to process claim: ${err}`);
        // Continue with next claim
      }
    }

    // Mark run complete
    await db
      .update(aiScrapeRuns)
      .set({
        completedAt: new Date(),
        rawItemsCollected: scrapedClaims.length,
        claimsDiscovered: claimsProcessed,
        claimsPublished: publishedCount,
        status: 'success',
      })
      .where(eq(aiScrapeRuns.id, runRecord.id));

    logger.info(
      `[claim-discovery] Run complete: ${claimsProcessed} processed, ${publishedCount} published`
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
