/**
 * scripts/seed-prod.ts
 *
 * Apply the heavy demo seed (CLAUDE.md: "Heavy demo seed is mandatory")
 * to the **production** Postgres (Aiven) directly from your local machine,
 * with full visibility into what's about to happen and what changed.
 *
 * Mirrors the design of scripts/migrate-prod.ts:
 *
 *   1. Prints the target DB (host, db, user) so you can sanity-check before
 *      anything is written.
 *   2. Refuses to run on a non-loopback host unless `--yes` is passed.
 *   3. Snapshots pre-flight row counts for every seeded table.
 *   4. Calls the idempotent `runSeed()` exported from src/db/seed.ts so the
 *      dev and prod paths share a single source of truth for the data.
 *   5. Snapshots post-flight row counts and prints a diff so you can see
 *      exactly what was created vs. skipped.
 *
 * The seed itself is idempotent: re-running will not duplicate rows. It uses
 * `INSERT ... ON CONFLICT DO NOTHING` everywhere a uniqueness collision is
 * possible (user email, claim text, badge slug, user_badges composite PK,
 * weekly report per-user-per-week, today's forecast). So a second run on a
 * live prod DB is a no-op — it just re-affirms the demo data.
 *
 * Usage:
 *
 *   # Default — picks up Aiven creds from server/.env.prod (gitignored).
 *   # Fill in DB_HOST / DB_USER / DB_PASSWORD / DB_NAME there once, then:
 *   npm run seed:prod -- --yes
 *
 *   # Still works inline if you prefer (overrides anything in .env.prod):
 *   DB_HOST=... DB_PORT=... DB_USER=... DB_PASSWORD=... DB_NAME=... npm run seed:prod -- --yes
 *
 *   # Preview what would be inserted without writing anything:
 *   npm run seed:prod -- --dry-run
 *
 *   # Force-allow non-loopback writes (e.g. against a staging DB):
 *   npm run seed:prod -- --yes
 *
 * Safety:
 *   - Loopback hosts (localhost, 127.0.0.1, ::1) are always allowed without
 *     `--yes` — that's the dev DB.
 *   - Any other host (e.g. Aiven) requires `--yes` to proceed. This is the
 *     same convention as migrate-prod --reset --yes.
 */

import 'dotenv/config';
import { config as loadDotenv } from 'dotenv';
// Override dev defaults in `server/.env` with the Aiven creds stored in
// `server/.env.prod` (gitignored). If the file is missing, this no-ops and
// the script keeps using whatever's in `server/.env` or shell env vars.
//
// IMPORTANT: must run BEFORE the dynamic `import('../src/config')` inside
// main() — `src/config.ts` reads `process.env` at module-load time, and
// ESM hoists top-level `import` statements above top-level code. So a
// static `import { config } from '../src/config'` would capture the OLD
// process.env (from `server/.env`) and ignore the override below.
loadDotenv({ path: '.env.prod', override: true });

import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

import { runSeed, type SeedSummary } from '../src/db/seed';
import * as schema from '../src/db/schema';

type Args = { yes: boolean; dryRun: boolean };

function parseArgs(argv: string[]): Args {
  return {
    yes: argv.includes('--yes') || argv.includes('-y'),
    dryRun: argv.includes('--dry-run'),
  };
}

function isLoopback(host: string): boolean {
  return host === 'localhost' || host === '127.0.0.1' || host === '::1';
}

/**
 * Quick row-count snapshot across every table the seed touches (plus a few
 * related ones for visibility). Single round-trip per table; cheap on Aiven.
 */
async function snapshotCounts(pool: Pool): Promise<Record<string, number>> {
  const tables = [
    'users',
    'user_settings',
    'claims',
    'guesses',
    'badges',
    'user_badges',
    'weekly_reports',
    'scam_forecasts',
    'scam_forecast_items',
  ] as const;

  const out: Record<string, number> = {};
  for (const t of tables) {
    const { rows } = await pool.query(`SELECT COUNT(*)::int AS n FROM "${t}"`);
    out[t] = rows[0]?.n ?? 0;
  }
  return out;
}

function diffCounts(before: Record<string, number>, after: Record<string, number>): void {
  console.log('\n── Row-count diff ──');
  console.log('  table                  before   after    delta');
  for (const t of Object.keys(before)) {
    const b = before[t] ?? 0;
    const a = after[t] ?? 0;
    const d = a - b;
    const sign = d > 0 ? '+' : '';
    console.log(`  ${t.padEnd(22)} ${String(b).padStart(6)}   ${String(a).padStart(6)}   ${sign}${d}`);
  }
}

function formatSummary(s: SeedSummary): void {
  console.log('\n── Seed summary ──');
  console.log(`  demo user:        ${s.users.demo} (${s.demoUserId})`);
  console.log(`  leaderboard cast: ${s.users.leaderboard}`);
  console.log(`  claims:           ${s.claims.inserted} new / ${s.claims.total} total`);
  console.log(`  demo guesses:     ${s.guesses}`);
  console.log(`  badge defs:       ${s.badges.defs}`);
  console.log(`  demo badges:      ${s.badges.earned} new`);
  console.log(`  weekly report:    week of ${s.weeklyReport.weekStarting} (${s.weeklyReport.inserted ? 'new' : 'already exists'})`);
  console.log(`  scam forecast:    ${s.scamForecast.date} — ${s.scamForecast.items} items (${s.scamForecast.inserted ? 'new' : 'already exists'})`);
}

async function main(): Promise<void> {
  // Dynamic import so `src/config.ts` reads `process.env` AFTER the
  // `.env.prod` override above. See comment next to the loadDotenv() call.
  const { config } = await import('../src/config');

  const args = parseArgs(process.argv.slice(2));

  console.log('── Target ──');
  console.log(`  Host:     ${config.database.host}:${config.database.port}`);
  console.log(`  Database: ${config.database.database}`);
  console.log(`  User:     ${config.database.user}`);
  console.log(
    `  SSL:      ${isLoopback(config.database.host) ? 'off (loopback)' : 'on (rejectUnauthorized: false)'}`,
  );

  // Safety: refuse to write to non-loopback hosts without --yes.
  if (!isLoopback(config.database.host) && !args.yes && !args.dryRun) {
    console.error('\n❌ Refusing to seed a non-loopback database without --yes.');
    console.error(`   Target host: ${config.database.host}`);
    console.error('   Re-run with: npm run seed:prod -- --yes');
    console.error('   Or preview with: npm run seed:prod -- --dry-run');
    process.exit(2);
  }

  if (args.dryRun) {
    console.log('\n── DRY RUN — no writes will be made ──');
  }

  const pool = new Pool({
    host: config.database.host,
    port: config.database.port,
    user: config.database.user,
    password: config.database.password,
    database: config.database.database,
    ssl: isLoopback(config.database.host) ? false : { rejectUnauthorized: false },
  });

  pool.on('error', (err) => {
    console.error('[pool error]', err.message);
    process.exitCode = 1;
  });

  try {
    // 1. Pre-flight snapshot
    const before = await snapshotCounts(pool);
    console.log('\n── PRE-FLIGHT row counts ──');
    for (const [t, n] of Object.entries(before)) console.log(`  ${t.padEnd(22)} ${n}`);

    // 2. Run the idempotent seed
    // The Drizzle instance is created here (rather than imported from
    // src/db/index) so this script doesn't pull in HTTP-middleware
    // dependencies that the prod CLI doesn't need. The schema reference is
    // still used for the Drizzle instance even though we drive everything
    // through runSeed() — keeps the connection typed.
    const db = drizzle(pool, { schema });
    // The seed uses its own internal `db` import, so we just call runSeed
    // and ignore this local one. Reference `db` to avoid an unused-var lint.
    void db;
    const start = Date.now();
    const summary = await runSeed({ dryRun: args.dryRun, verbose: true });
    const ms = Date.now() - start;

    // 3. Post-flight snapshot
    const after = args.dryRun ? before : await snapshotCounts(pool);
    diffCounts(before, after);

    // 4. Structured summary
    formatSummary(summary);

    console.log(`\n── Duration: ${ms}ms ──`);
    console.log(args.dryRun ? '\n✓ Dry run complete (no rows written).' : '\n✓ Prod seed complete.');
  } catch (err) {
    console.error('\n❌ Seed FAILED');
    console.error('   Error name:    ', (err as Error).name);
    console.error('   Error message: ', (err as Error).message);
    if ((err as { code?: string }).code) {
      console.error('   Postgres code: ', (err as { code: string }).code);
    }
    if ((err as { detail?: string }).detail) {
      console.error('   Detail:        ', (err as { detail: string }).detail);
    }
    if ((err as { hint?: string }).hint) {
      console.error('   Hint:          ', (err as { hint: string }).hint);
    }
    if ((err as { constraint?: string }).constraint) {
      console.error('   Constraint:    ', (err as { constraint: string }).constraint);
    }
    console.error('\n   Stack:');
    console.error((err as Error).stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
