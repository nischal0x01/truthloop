/**
 * drizzle-kit config — used by `npm run db:generate` and `npm run db:migrate`.
 * Must be run from project root (not server/ workspace).
 */
import { defineConfig } from 'drizzle-kit';

const databaseUrl =
  process.env.DATABASE_URL ??
  `postgresql://${process.env.DB_USER ?? 'postgres'}:${process.env.DB_PASSWORD ?? ''}@${process.env.DB_HOST ?? 'localhost'}:${process.env.DB_PORT ?? '5432'}/${process.env.DB_NAME ?? 'mirror'}`;

export default defineConfig({
  schema: './server/src/db/schema', // directory, not single file
  out: './server/drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: databaseUrl },
  verbose: true,
  strict: true,
});
