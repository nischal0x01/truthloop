/**
 * drizzle-kit config — used by `npm run db:generate` and `npm run db:migrate`.
 * Lives next to server/package.json so the npm scripts resolve it by default.
 *
 * Loads DATABASE_URL from server/.env automatically (drizzle-kit reads .env
 * from the cwd).
 */
import { defineConfig } from 'drizzle-kit';

const databaseUrl =
  process.env.DATABASE_URL ??
  `postgresql://${process.env.DB_USER ?? 'postgres'}:${process.env.DB_PASSWORD ?? ''}@${process.env.DB_HOST ?? 'localhost'}:${process.env.DB_PORT ?? '5432'}/${process.env.DB_NAME ?? 'truthloop'}`;

export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: databaseUrl },
  verbose: true,
  strict: true,
});
