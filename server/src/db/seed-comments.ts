/**
 * Comment seed — populates discussion threads so every claim looks alive on a
 * cold load (CLAUDE.md: "Heavy demo seed is mandatory").
 *
 * Run:  npm run db:seed:comments  --workspace server
 *
 * Idempotent: bails out per-claim if that claim already has comments, so
 * re-running never duplicates threads. Safe to run against a live demo DB.
 *
 * Creates a small cast of synthetic commenters (@seed.truthloop.app) — they
 * have no googleId / passwordHash, so they can never be signed into. Real
 * users and the demo account are left untouched.
 */
import { eq, sql } from 'drizzle-orm';
import { db, schema } from './index';

/* ── Synthetic cast ── */

const CAST = [
  { handle: 'maya_reads', name: 'Maya R.' },
  { handle: 'devkoirala', name: 'Dev Koirala' },
  { handle: 'sceptic_sam', name: 'Sam O.' },
  { handle: 'anon_owl', name: 'Nocturnal Owl' },
  { handle: 'lina.verifies', name: 'Lina M.' },
  { handle: 'tomas_fc', name: 'Tomás B.' },
] as const;

/**
 * Thread templates. Deliberately generic so they read sensibly on any claim —
 * the demo has many claims and hand-writing a thread per claim doesn't scale.
 * `replies` nest one level; `replies[].replies` nest two.
 */
const TEMPLATES: ReadonlyArray<{
  body: string;
  up: number;
  down: number;
  replies?: ReadonlyArray<{
    body: string;
    up: number;
    down: number;
    replies?: ReadonlyArray<{ body: string; up: number; down: number }>;
  }>;
}> = [
  {
    body: 'Traced this back to the original source and the numbers do not match what is being quoted here. The screenshot going around has been cropped.',
    up: 47,
    down: 2,
    replies: [
      {
        body: 'Same. The cropped version drops the sample size, which is the entire problem with it.',
        up: 22,
        down: 0,
        replies: [
          {
            body: 'Posted the full chart in the sources tab — the difference is night and day.',
            up: 11,
            down: 1,
          },
        ],
      },
      {
        body: 'Worth noting the original was published in 2019, so even the accurate version is out of date now.',
        up: 9,
        down: 1,
      },
    ],
  },
  {
    body: 'I genuinely fell for this one. The formatting mimics a real news alert almost perfectly — that is what got me.',
    up: 31,
    down: 1,
    replies: [
      {
        body: 'Same, the fake outlet name is one letter off from a real one. Nasty detail.',
        up: 14,
        down: 0,
      },
    ],
  },
  {
    body: 'Reverse image search puts this photo three years earlier in a completely different country.',
    up: 26,
    down: 3,
  },
  {
    body: 'Careful — the underlying event is real, it is the framing around it that is doing the misleading. Not the same as fabricated.',
    up: 18,
    down: 5,
    replies: [
      {
        body: 'This is the distinction people keep missing. Selective truth is still manipulation.',
        up: 12,
        down: 2,
      },
    ],
  },
  {
    body: 'The tell for me was the urgency. Anything pushing you to act in the next ten minutes deserves a second look.',
    up: 15,
    down: 0,
  },
];

/* ── Helpers ── */

/** Upsert a synthetic commenter, returning its id. */
async function ensureUser(handle: string, name: string): Promise<string> {
  const email = `${handle}@seed.truthloop.app`;

  const [existing] = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1);
  if (existing) return existing.id;

  const [created] = await db
    .insert(schema.users)
    .values({
      email,
      displayName: name,
      // Deterministic avatar so the seed looks the same on every machine.
      avatarUrl: null,
      points: 100 + Math.floor(handle.length * 37) % 900,
    })
    .returning({ id: schema.users.id });

  return created.id;
}

/* ── Main ── */

async function main() {
  console.log('→ Seeding comment threads…');

  const authorIds: string[] = [];
  for (const { handle, name } of CAST) {
    authorIds.push(await ensureUser(handle, name));
  }
  console.log(`  cast ready (${authorIds.length} commenters)`);

  const claims = await db
    .select({ id: schema.claims.id })
    .from(schema.claims)
    .where(eq(schema.claims.isPublished, true));

  if (claims.length === 0) {
    console.warn('  no published claims found — seed the claims table first. Nothing to do.');
    return;
  }

  let inserted = 0;
  let skipped = 0;
  let author = 0;
  const nextAuthor = () => authorIds[author++ % authorIds.length];

  for (const [claimIndex, claim] of claims.entries()) {
    // Idempotency guard — never double-seed a thread.
    const [{ count }] = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(schema.comments)
      .where(eq(schema.comments.claimId, claim.id));

    if (Number(count) > 0) {
      skipped++;
      continue;
    }

    // Vary thread size per claim (2–4 top-level) so the feed doesn't look
    // mechanically uniform.
    const topCount = 2 + (claimIndex % 3);
    const chosen = TEMPLATES.slice(0, topCount);

    for (const top of chosen) {
      const [topRow] = await db
        .insert(schema.comments)
        .values({
          claimId: claim.id,
          userId: nextAuthor(),
          parentCommentId: null,
          body: top.body,
          upvotes: top.up,
          downvotes: top.down,
        })
        .returning({ id: schema.comments.id });
      inserted++;

      for (const reply of top.replies ?? []) {
        const [replyRow] = await db
          .insert(schema.comments)
          .values({
            claimId: claim.id,
            userId: nextAuthor(),
            parentCommentId: topRow.id,
            body: reply.body,
            upvotes: reply.up,
            downvotes: reply.down,
          })
          .returning({ id: schema.comments.id });
        inserted++;

        for (const deep of reply.replies ?? []) {
          await db.insert(schema.comments).values({
            claimId: claim.id,
            userId: nextAuthor(),
            parentCommentId: replyRow.id,
            body: deep.body,
            upvotes: deep.up,
            downvotes: deep.down,
          });
          inserted++;
        }
      }
    }
  }

  console.log(
    `✓ Done. ${inserted} comments inserted across ${claims.length - skipped} claims` +
      (skipped ? ` (${skipped} already had threads, skipped)` : '')
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('✗ Comment seed failed:', err);
    process.exit(1);
  });
