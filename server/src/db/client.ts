/**
 * Drizzle client — wraps the existing pg pool from `@/utils/db`.
 * Keeps the raw `pool` / `query()` helpers (for hand-written SQL) alongside the
 * type-safe Drizzle query builder.
 *
 * Usage:
 *   import { db, schema } from '@/db';
 *   import { eq } from 'drizzle-orm';
 *
 *   const user = await db.select().from(schema.users).where(eq(schema.users.id, id));
 *
 * Raw SQL escape hatch:
 *   import { sql } from 'drizzle-orm';
 *   const result = await db.execute(sql`SELECT ... complex CTE ...`);
 */
import { drizzle } from 'drizzle-orm/node-postgres';
import { pool } from '@/utils/db';
import * as schema from './schema';

export const db = drizzle(pool, { schema });

export { schema };
export * from './schema';