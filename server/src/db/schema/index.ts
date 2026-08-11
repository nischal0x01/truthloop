/**
 * Schema barrel — single import surface for every table, enum, and type.
 *
 * Usage in routes:
 *   import { db, schema } from '@/db';
 *   import { eq } from 'drizzle-orm';
 *
 *   const claims = await db.select().from(schema.claims).where(eq(schema.claims.id, id));
 *
 * The Drizzle client also auto-picks these up via `drizzle(pool, { schema })`,
 * which lets you write `db.query.claims.findFirst()` for relations later.
 *
 * Per-domain modules live alongside this file:
 *   ./enums.ts         — all pgEnum definitions
 *   ./users.ts         — users, userSettings
 *   ./claims.ts        — claims, guesses
 *   ./comments.ts      — comments, commentVotes
 *   ./submissions.ts   — userSubmissions
 *   ./forecasts.ts     — scamForecasts, scamForecastItems, forecastVotes
 *   ./gamification.ts  — badges, userBadges
 *   ./notifications.ts — notifications
 *   ./reports.ts       — weeklyReports
 */
export * from './enums';
export * from './users';
export * from './claims';
export * from './comments';
export * from './submissions';
export * from './forecasts';
export * from './gamification';
export * from './notifications';
export * from './reports';
export * from './ai-discovery';