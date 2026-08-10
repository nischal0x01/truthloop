/**
 * Database module — single import surface for everything DB-related.
 *
 * Re-exports:
 *   - Drizzle client (`db`, `schema`) for type-safe queries
 *   - Raw `pool` / `query` / `transaction` / `healthCheck` for hand-written SQL
 *   - All schema types
 */
export { db, schema } from './client';
export * from './schema';

// Raw pg helpers (kept for complex queries / migrations / health checks)
export { query, getClient, transaction, healthCheck, pool } from '@/utils/db';