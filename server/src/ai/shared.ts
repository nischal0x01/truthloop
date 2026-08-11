/**
 * Shared utilities for the AI layer.
 */

/** ISO date string for today in UTC — used to give MiniMax temporal context. */
export const Today = new Date().toISOString().split('T')[0]; // "2026-08-11"
