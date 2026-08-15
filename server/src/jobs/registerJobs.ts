/**
 * Cron registration. Called from `server/src/index.ts` after the DB pool
 * connects — guards on `config.cron.enabled` so test runs skip entirely.
 *
 * Each cron logs a one-line summary at boot so the operator can confirm
 * jobs are armed. The job bodies' own `runXxx()` helpers stay callable
 * directly for manual triggers (tsx scripts/...).
 */

import cron from 'node-cron';
import { config } from '@/config';
import { logger } from '@/utils/logger';
import { runDigest } from './digest';
import { runWeeklyReport } from './weekly-report';
import { runClaimHarvest } from './claimHarvester';

interface RegisteredJob {
  name: string;
  schedule: string;
}

const _registered: RegisteredJob[] = [];

function schedule(name: string, expression: string, handler: () => Promise<unknown>) {
  const task = cron.schedule(
    expression,
    () => {
      handler().catch((err) => {
        logger.error({ err, job: name }, '[cron] job threw');
      });
    },
    { timezone: config.cron.timezone }
  );
  task.start();
  _registered.push({ name, schedule: expression });
  logger.info({ job: name, expression, tz: config.cron.timezone }, '[cron] scheduled');
}

/** Wire up every scheduled job. Idempotent — calling twice is a no-op. */
export function startJobs(): void {
  if (_registered.length > 0) return;
  if (!config.cron.enabled) {
    logger.warn('[cron] disabled via CRON_ENABLED=false — jobs will not run');
    return;
  }

  // Top of every hour (override via HARVEST_CRON) — pulls trending
  // misinformation + scams from the web and inserts them into the
  // claims feed. Independent kill switch via HARVEST_ENABLED=false.
  if (config.harvest.enabled) {
    schedule('claim-harvest', config.harvest.schedule, runClaimHarvest);
  } else {
    logger.warn(
      '[cron] claim-harvest disabled via HARVEST_ENABLED=false — feed will not auto-refresh'
    );
  }

  // 08:00 UTC daily — digest email.
  schedule('digest', '0 8 * * *', runDigest);

  // Sunday 00:00 UTC — weekly blind-spot report email.
  schedule('weekly-report', '0 0 * * 0', runWeeklyReport);
}

export const _internals = { _registered };