/**
 * scripts/migrate-prod.ts
 *
 * Apply pending Drizzle migrations to the **production** Postgres (Aiven)
 * directly from your local machine, with full visibility into what's
 * happening. Unlike `db:migrate` (which is `drizzle-kit migrate` and
 * swallows errors behind a spinner), this script:
 *
 *   1. Connects with explicit SSL config (works around Aiven's verify-full trap)
 *   2. Prints pre-flight DB state (extensions, schemas, tables, migrations table)
 *   3. Runs migrations via drizzle-orm's programmatic migrator, which throws
 *      loudly on SQL errors instead of swallowing them in spinner output
 *   4. Prints post-flight state to confirm exactly what changed
 *
 * Usage:
 *   # Default — picks up Aiven creds from server/.env.prod (gitignored).
 *   # Fill in DB_HOST / DB_USER / DB_PASSWORD / DB_NAME there once, then:
 *   npm run migrate:prod
 *
 *   # Still works inline if you prefer (overrides anything in .env.prod):
 *   DB_HOST=... DB_PORT=... DB_USER=... DB_PASSWORD=... DB_NAME=... npm run migrate:prod
 *
 *   # If Aiven is in a broken state (leftover tables from failed prior attempts):
 *   npm run migrate:prod -- --reset --yes
 *
 *   # See what would happen without applying:
 *   npm run migrate:prod -- --dry-run
 *
 * Notes:
 *   - We deliberately use `drizzle-orm/node-postgres/migrator` (not
 *     `drizzle-kit migrate`) because the CLI hides SQL errors behind its
 *     progress spinner. The programmatic migrator throws synchronously and
 *     we get the full Postgres error message + stack.
 *   - `--reset` drops ALL tables in `public` and `drizzle.__drizzle_migrations`
 *     before applying. Safe to run on a broken DB; DESTRUCTIVE on a healthy one.
 *     Refuses to run unless `--yes` is also passed.
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
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

// ESM doesn't define __dirname; derive it from import.meta.url
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { logger } from '../src/utils/logger';

type Args = { reset: boolean; dryRun: boolean; yes: boolean };

function parseArgs(argv: string[]): Args {
  return {
    reset: argv.includes('--reset'),
    dryRun: argv.includes('--dry-run'),
    yes: argv.includes('--yes'),
  };
}

/* ── Pre-flight: snapshot DB state ─────────────────────────────────────── */

async function snapshotState(
  pool: Pool,
  label: string,
): Promise<{ extensions: string[]; schemas: string[]; tables: { schema: string; name: string }[]; migrationRows: { id: number; hash: string }[] }> {
  const [ext, sch, tbls, migs] = await Promise.all([
    pool.query(`SELECT extname FROM pg_extension ORDER BY extname`),
    pool.query(`SELECT schema_name FROM information_schema.schemata WHERE schema_name NOT IN ('pg_catalog','information_schema','pg_toast') ORDER BY schema_name`),
    pool.query(`SELECT n.nspname AS schema, c.relname AS name FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind IN ('r','p') AND n.nspname NOT IN ('pg_catalog','information_schema','pg_toast') ORDER BY n.nspname, c.relname`),
    pool.query(`SELECT id, hash FROM drizzle.__drizzle_migrations ORDER BY id`).catch((e) => {
      // Table doesn't exist yet — that's the expected starting state for a fresh DB.
      if ((e as { code?: string }).code === '42P01') return { rows: [] as { id: number; hash: string }[] };
      throw e;
    }),
  ]);

  return {
    extensions: ext.rows.map((r) => r.extname),
    schemas: sch.rows.map((r) => r.schema_name),
    tables: tbls.rows,
    migrationRows: migs.rows,
  };
}

function printState(label: string, state: Awaited<ReturnType<typeof snapshotState>>): void {
  console.log(`\n── ${label} ──`);
  console.log(`  Extensions:    ${state.extensions.join(', ') || '(none)'}`);
  console.log(`  Schemas:       ${state.schemas.join(', ') || '(none)'}`);
  console.log(`  Tables:        ${state.tables.length}`);
  for (const t of state.tables) console.log(`    • ${t.schema}.${t.name}`);
  console.log(`  Migrations:    ${state.migrationRows.length}`);
  for (const m of state.migrationRows) console.log(`    • #${m.id} ${m.hash.slice(0, 16)}…`);
}

/* ── Reset: drop everything in public + drizzle.__drizzle_migrations ── */

async function resetDb(pool: Pool): Promise<void> {
  console.log('\n⚠️  Resetting DB — dropping all tables in public + drizzle.__drizzle_migrations');
  // Drop our schema first (cascades to __drizzle_migrations)
  await pool.query(`DROP SCHEMA IF EXISTS public CASCADE`);
  await pool.query(`CREATE SCHEMA public`)
  // Re-grant default privileges to avnadmin (Aiven default user)
  await pool.query(`GRANT ALL ON SCHEMA public TO ${config.database.user}`);
  await pool.query(`GRANT ALL ON SCHEMA public TO public`);
  console.log('   ✓ public schema cleared');
}

/* ── Main ─────────────────────────────────────────────────────────────── */

async function main(): Promise<void> {
  // Dynamic import so `src/config.ts` reads `process.env` AFTER the
  // `.env.prod` override above. See comment next to the loadDotenv() call.
  const { config } = await import('../src/config');

  const args = parseArgs(process.argv.slice(2));

  console.log('── Target ──');
  console.log(`  Host:     ${config.database.host}:${config.database.port}`);
  console.log(`  Database: ${config.database.database}`);
  console.log(`  User:     ${config.database.user}`);
  console.log(`  SSL:      ${config.database.host === 'localhost' ? 'off (loopback)' : 'on (rejectUnauthorized: false)'}`);

  const pool = new Pool({
    host: config.database.host,
    port: config.database.port,
    user: config.database.user,
    password: config.database.password,
    database: config.database.database,
    ssl:
      config.database.host === 'localhost' ||
      config.database.host === '127.0.0.1' ||
      config.database.host === '::1'
        ? false
        : { rejectUnauthorized: false },
  });

  // Surface pool-level errors loudly (e.g., connection drops mid-migration)
  pool.on('error', (err) => {
    console.error('[pool error]', err.message);
    process.exitCode = 1;
  });

  try {
    // 1. Pre-flight
    const before = await snapshotState(pool, 'PRE-FLIGHT STATE');
    printState('PRE-FLIGHT STATE', before);

    if (args.dryRun) {
      console.log('\n── DRY RUN — no changes applied ──');
      return;
    }

    // 2. Optional reset
    if (args.reset) {
      if (!args.yes) {
        console.error('\n❌ Refusing to reset without --yes flag.');
        console.error('   This is destructive. Re-run with: npm run migrate:prod -- --reset --yes');
        process.exit(2);
      }
      await resetDb(pool);
    }

    // 3. Migrate via drizzle-orm's programmatic migrator (throws loudly)
    console.log('\n── Applying migrations ──');
    const db = drizzle(pool);
    const migrationsFolder = path.resolve(__dirname, '..', 'drizzle');
    console.log(`  Folder: ${migrationsFolder}`);

    const start = Date.now();
    await migrate(db, { migrationsFolder });
    const ms = Date.now() - start;
    console.log(`  ✓ Migrations applied in ${ms}ms`);

    // 4. Post-flight
    const after = await snapshotState(pool, 'POST-FLIGHT STATE');
    printState('POST-FLIGHT STATE', after);

    // 5. Diff summary
    const newMigrations = after.migrationRows.length - before.migrationRows.length;
    const newTables = after.tables.length - before.tables.length;
    console.log(`\n── Summary ──`);
    console.log(`  Migrations applied: ${newMigrations}`);
    console.log(`  Tables created:     ${newTables}`);
    console.log(`  Duration:           ${ms}ms`);
    if (newMigrations > 0 || newTables > 0) {
      logger.info({ newMigrations, newTables, durationMs: ms }, 'Prod migration complete');
    }
  } catch (err) {
    console.error('\n❌ Migration FAILED');
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
    if ((err as { position?: string }).position) {
      console.error('   Position:      ', (err as { position: string }).position);
    }
    if ((err as { query?: string }).query) {
      console.error('   Failing query: ', (err as { query: string }).query);
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