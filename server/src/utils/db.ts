import { Pool, PoolClient, QueryResult, type QueryResultRow } from 'pg';
import { config } from '@/config';
import { logger } from '@/utils/logger';

/**
 * Whether the pool should open its connection with TLS.
 *
 * Aiven / Railway / Render all reject plaintext connections with
 * SQLSTATE 28000 ("invalid_authorization_specification"). We turn TLS on
 * for any non-loopback host so local dev pointing at a remote DB works,
 * while local dev pointing at a local Postgres stays plaintext.
 *
 * Override at runtime with `DB_SSL=true` or `DB_SSL=false`.
 */
const isLocalHost = (host: string) =>
  host === 'localhost' || host === '127.0.0.1' || host === '::1';

const useSsl = (): boolean => {
  const override = process.env.DB_SSL;
  if (override === 'true') return true;
  if (override === 'false') return false;
  return !isLocalHost(config.database.host);
};

const pool = new Pool({
  host: config.database.host,
  port: config.database.port,
  user: config.database.user,
  password: config.database.password,
  database: config.database.database,
  // Aiven / Railway / Render all reject plaintext connections with
  // SQLSTATE 28000 ("invalid_authorization_specification"). The
  // `useSsl()` helper above decides TLS-on based on host (override
  // with `DB_SSL=true|false`). We pass the helper's decision into pg;
  // in TLS mode we skip cert verification because Aiven's CA isn't
  // always in Node's bundled trust store.
  ssl: useSsl() ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// @types/pg v8 changed the 'error' event signature; cast back to the classic form.
(pool as unknown as { on: (e: string, l: (err: Error) => void) => void }).on(
  'error',
  (err: Error) => {
    logger.error({ err }, 'Unexpected error on idle client');
  }
);

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  // @types/pg v8 prefers the config-object form; both are equivalent at runtime.
  const result = await (
    pool as unknown as {
      query: <R extends QueryResultRow>(
        cfg: { text: string; values?: unknown[] }
      ) => Promise<QueryResult<R>>;
    }
  ).query<T>({ text, values: params });
  const duration = Date.now() - start;
  logger.info({ text, duration, rows: result.rowCount }, 'Executed query');
  return result;
}

export async function getClient(): Promise<PoolClient> {
  return pool.connect();
}

export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function healthCheck(): Promise<boolean> {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch (err) {
    logger.error({ err }, 'Database health check failed');
    return false;
  }
}

/**
 * Verify the pool can reach the DB at boot time. Logs the resolved
 * connection target + ping result so you can see "DB connected" on startup
 * instead of waiting for the first query to fail.
 */
export async function connectDb(): Promise<boolean> {
  const target = {
    host: config.database.host,
    port: config.database.port,
    database: config.database.database,
    user: config.database.user,
    ssl: useSsl() ? 'on' : 'off',
  };
  logger.info(target, 'Connecting to database');
  const ok = await healthCheck();
  if (ok) {
    logger.info(target, 'Database connected');
  } else {
    logger.error(target, 'Database connection FAILED — check DATABASE_URL / credentials');
  }
  return ok;
}

export { pool };