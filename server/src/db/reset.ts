/**
 * scripts equivalent for local dev: drop the `public` schema in your LOCAL
 * Postgres and re-apply the Drizzle migrations from `drizzle/`.
 *
 * Why a dedicated file instead of `npm run migrate:prod -- --reset --yes`?
 * `migrate-prod.ts` reads `.env.prod` and targets Aiven — running it with
 * `--reset --yes` would obliterate prod. This script always targets the
 * LOCAL DB (whatever `process.env.DATABASE_URL` points to from `.env`).
 *
 * Usage:
 *   npm run db:reset            # drop + recreate + migrate (safe to re-run)
 *   npm run db:seed             # populate demo data
 *
 * It refuses to run unless the DB host is loopback, so a stray copy/paste
 * can't reach prod by accident.
 */

import 'dotenv/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import * as path from 'node:path';

import { logger } from '@/utils/logger';

const url = process.env.DATABASE_URL;
if (!url) {
  logger.error('DATABASE_URL is missing — set it in server/.env');
  process.exit(1);
}

// Refuse to run against anything that isn't loopback. Cheap safety net.
const host = new URL(url).hostname;
const isLoopback =
  host === 'localhost' ||
  host === '127.0.0.1' ||
  host === '::1' ||
  host === '0.0.0.0';
if (!isLoopback) {
  logger.error(
    { host },
    'Refusing to reset — DATABASE_URL host is not loopback. This script is for local dev only.',
  );
  process.exit(2);
}

logger.info({ host, url: url.replace(/:[^:@]+@/, ':***@') }, 'Resetting LOCAL DB');

const pool = new Pool({ connectionString: url });
pool.on('error', (err) => logger.error({ err }, '[pool error]'));

try {
  // 1. Drop everything in BOTH public AND the drizzle bookkeeping schema.
  //    • `public` — all the actual tables (claims, users, …)
  //    • `drizzle` — `__drizzle_migrations` table that records which SQL
  //      migrations have run. Without dropping it too, drizzle-orm's
  //      migrator sees the previous run's history and SKIPS applying the
  //      SQL again — so you end up with an empty database it thinks is
  //      up to date.
  logger.info('Dropping public + drizzle schemas (cascades to all tables + migration log)');
  await pool.query(`DROP SCHEMA IF EXISTS public CASCADE`);
  await pool.query(`DROP SCHEMA IF EXISTS drizzle CASCADE`);
  await pool.query(`CREATE SCHEMA public`);
  await pool.query(`CREATE SCHEMA drizzle`);

  // Re-grant defaults — Postgres 15+ strips them after DROP SCHEMA
  await pool.query(`GRANT ALL ON SCHEMA public TO PUBLIC`);

  // 2. Re-apply migrations
  logger.info('Applying Drizzle migrations');
  const db = drizzle(pool);
  await migrate(db, {
    migrationsFolder: path.resolve(process.cwd(), 'drizzle'),
  });

  logger.info('Reset complete — next: `npm run db:seed` then `npm run db:seed:comments`');
  process.exit(0);
} catch (err) {
  logger.error({ err }, 'Reset failed');
  process.exit(1);
}
