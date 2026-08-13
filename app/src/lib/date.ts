/**
 * Date math helpers used by the weekly-report range filter.
 * Kept dependency-free and pure — no Date.now() / no mutations.
 *
 * All helpers operate on the user's *local* date for ranges the user picked,
 * but use UTC when computing boundaries that the backend will compare against
 * timestamp columns (see backend `server/src/routes/reports.ts`).
 */

/** UTC midnight for the start of the Sunday-anchored week containing `d`. */
export function weekStart(d: Date): Date {
  const u = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  );
  const dow = u.getUTCDay(); // 0 = Sun
  u.setUTCDate(u.getUTCDate() - dow);
  return u;
}

/** UTC midnight for the first day of the month containing `d`. */
export function monthStart(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

/** UTC midnight for the first day of the 3-month block containing `d`. */
export function quarterStart(d: Date): Date {
  const qStartMonth = Math.floor(d.getUTCMonth() / 3) * 3;
  return new Date(Date.UTC(d.getUTCFullYear(), qStartMonth, 1));
}

/** Returns a new date `n` days after `d` (UTC). */
export function addDays(d: Date, n: number): Date {
  const u = new Date(d.getTime());
  u.setUTCDate(u.getUTCDate() + n);
  return u;
}

/** Whole days between `from` and `to`. Inclusive of `from`, exclusive of `to`. */
export function daysBetween(from: Date, to: Date): number {
  return Math.max(
    1,
    Math.round((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000))
  );
}

/**
 * Human-friendly date range label, e.g.:
 *   Aug 10 — Aug 16, 2026  (same month)
 *   Aug 30 — Sep 5, 2026   (same year, different month)
 *   Dec 28, 2025 — Jan 3, 2026  (different year)
 */
export function formatRange(from: Date, to: Date): string {
  const sameMonth =
    from.getUTCFullYear() === to.getUTCFullYear() &&
    from.getUTCMonth() === to.getUTCMonth();
  const fy = from.getUTCFullYear();
  const ty = to.getUTCFullYear();
  const fm = from.toLocaleDateString(undefined, { month: 'short', timeZone: 'UTC' });
  const tm = to.toLocaleDateString(undefined, { month: 'short', timeZone: 'UTC' });
  const fd = from.getUTCDate();
  const td = to.getUTCDate();

  if (sameMonth && fy === ty) return `${fm} ${fd} — ${td}, ${fy}`;
  if (fy === ty) return `${fm} ${fd} — ${tm} ${td}, ${fy}`;
  return `${fm} ${fd}, ${fy} — ${tm} ${td}, ${ty}`;
}

/** "Aug 10" — for chart labels on weekly-bucketed trend points. */
export function formatBucket(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

/** "Mon", "Tue", ... — for chart labels on daily trend points. */
export function formatWeekday(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short',
  });
}

/** Stable "YYYY-MM-DD" used for `<input type="date">` values. */
export function toDateInputValue(d: Date): string {
  return d.toISOString().slice(0, 10);
}
