/**
 * Badge evaluation — single source of truth for "which badges has this
 * user just earned?" Called from the vote and submit routes after a
 * successful insert.
 *
 * Strategy: check each of the 4 supported conditions against the user's
 * current state, and INSERT into `user_badges` with `ON CONFLICT DO
 * NOTHING`. The `RETURNING` clause tells us which rows were actually
 * inserted (vs. already earned) — those are the badges newly earned
 * in this call and should be surfaced to the frontend for the ceremony.
 *
 * Why only 4 of 8? The other 4 require counters that don't exist yet
 * (`sceptic` needs a "doubts in a row" tally, `discussant` needs a
 * comment count above 25, `sharp-eye` needs 50+ guesses with 90%+,
 * `truth-teller` needs 100+ correct). Wiring those is a separate
 * job — see `.ai/06-roadmap.md` Tier 4 #15.
 *
 * Naming note: `users.streak_days` is the source of truth for streak
 * badges. It's populated by the seed (demo user = 12) and stays static
 * until a streak-update hook is added (separate task).
 */

import { sql, eq, inArray } from 'drizzle-orm';
import { db, schema } from '@/db';
import type { Badge } from '@/db/schema/gamification';

/** Shape returned to the client — matches `ProfileBadge` in
 *  `app/src/actions/profile.ts` so the frontend can render the
 *  ceremony without a second round-trip. */
export interface NewlyEarnedBadge {
  slug: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  earnedAt: string;
}

/**
 * Evaluate the 4 awardable badges for a user and insert any that are
 * newly earned. Returns the slim payload the client needs to render
 * the ceremony — only badges that flipped from locked → unlocked in
 * this call.
 *
 * Safe to call on every vote/submit: idempotent via the
 * `user_badges (user_id, badge_slug)` primary key.
 */
export async function evaluateBadges(userId: string): Promise<NewlyEarnedBadge[]> {
  const newlyEarned: NewlyEarnedBadge[] = [];

  // Pull current state once. Three small queries are cheaper than
  // joining badges × user_badges × guesses × users for every check.
  const [userRow] = await db
    .select({
      streakDays: schema.users.streakDays,
      guessCount: sql<number>`(
        SELECT COUNT(*)::int FROM ${schema.guesses}
        WHERE ${schema.guesses.userId} = ${userId}
      )`,
    })
    .from(schema.users)
    .where(eq(schema.users.id, userId));

  if (!userRow) return newlyEarned;

  // Candidates the user qualifies for THIS call. We then attempt to
  // insert each one and only push to newlyEarned if the INSERT
  // actually wrote a row (vs. conflict-skipped).
  const candidates: Array<{ slug: string; reason: string }> = [];

  if (userRow.guessCount >= 1) {
    candidates.push({ slug: 'first-vote', reason: 'first guess' });
  }
  if (userRow.streakDays >= 7) {
    candidates.push({ slug: 'streak-7', reason: 'streak >= 7' });
  }
  if (userRow.streakDays >= 30) {
    candidates.push({ slug: 'streak-30', reason: 'streak >= 30' });
  }

  // founding-100: are there 100 or fewer users at-or-before this user
  // by id? UUIDs aren't time-ordered, so we fall back to created_at
  // ordering. For the demo this is always true (demo user seeded alone).
  const [userCreateRow] = await db
    .select({ createdAt: schema.users.createdAt })
    .from(schema.users)
    .where(eq(schema.users.id, userId));
  if (userCreateRow) {
    // `db.execute()` returns the raw pg QueryResult; the actual rows live
    // in `.rows`. (Destructuring the result directly — `[{ count }]` —
    // throws "not iterable", which is the symptom that surfaced here.)
    const result = await db.execute<{ count: number }>(sql`
      SELECT COUNT(*)::int AS count FROM ${schema.users}
      WHERE created_at <= ${userCreateRow.createdAt}
    `);
    const [{ count }] = result.rows;
    if (count <= 100) {
      candidates.push({ slug: 'founding-100', reason: 'among first 100 users' });
    }
  }

  if (candidates.length === 0) return newlyEarned;

  // INSERT ... ON CONFLICT DO NOTHING RETURNING — only newly-inserted
  // rows come back. Join with badges table to get the full definition.
  const inserted = await db
    .insert(schema.userBadges)
    .values(
      candidates.map((c) => ({ userId, badgeSlug: c.slug }))
    )
    .onConflictDoNothing()
    .returning({
      slug: schema.userBadges.badgeSlug,
      earnedAt: schema.userBadges.earnedAt,
    });

  if (inserted.length === 0) return newlyEarned;

  // Hydrate with badge definitions in one round-trip.
  const slugs = inserted.map((r) => r.slug);
  const definitions = await db
    .select()
    .from(schema.badges)
    .where(inArray(schema.badges.slug, slugs));

  const bySlug = new Map<string, Badge>(definitions.map((b) => [b.slug, b]));

  for (const row of inserted) {
    const def = bySlug.get(row.slug);
    if (!def) continue;
    newlyEarned.push({
      slug: def.slug,
      name: def.name,
      description: def.description,
      icon: def.icon,
      rarity: def.rarity,
      earnedAt: row.earnedAt.toISOString(),
    });
  }

  return newlyEarned;
}
