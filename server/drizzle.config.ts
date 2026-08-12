/**
 * drizzle-kit config — used by `npm run db:generate` and `npm run db:migrate`.
 * Lives next to server/package.json so the npm scripts resolve it by default.
 *
 * Loads DATABASE_URL from server/.env automatically (drizzle-kit reads .env
 * from the cwd).
 */
import { defineConfig } from 'drizzle-kit';

const isLocalHost = (host: string) =>
  host === 'localhost' || host === '127.0.0.1' || host === '::1';

const shouldUseSsl = (): boolean => {
  const override = process.env.DB_SSL;
  if (override === 'true') return true;
  if (override === 'false') return false;
  const host = process.env.DB_HOST ?? 'localhost';
  return !isLocalHost(host);
};

// drizzle-kit's `pg` driver hits the same SQLSTATE 28000 on Aiven / Railway /
// Render if the connection isn't encrypted. We can't just append ?sslmode=require
// to the URL — in current pg, `require` is an alias for `verify-full`, which
// tries to validate the cert chain against Node's bundled CA store, and Aiven's
// CA isn't there. Instead we pass `ssl: { rejectUnauthorized: false }` directly
// in dbCredentials so the connection encrypts without cert verification.
// This mirrors the runtime rule in src/utils/db.ts.
const databaseUrl =
  process.env.DATABASE_URL ??
  (() => {
    const host = process.env.DB_HOST ?? 'localhost';
    const port = process.env.DB_PORT ?? '5432';
    const user = process.env.DB_USER ?? 'postgres';
    const pass = process.env.DB_PASSWORD ?? '';
    const name = process.env.DB_NAME ?? 'truthloop';
    return `postgresql://${user}:${pass}@${host}:${port}/${name}`;
  })();

export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl,
    ssl: shouldUseSsl() ? { rejectUnauthorized: false } : false,
  },
  verbose: true,
  strict: true,
});
