/**
 * Comments routes — Reddit-style nested discussion on claims.
 * Mounted at /api/comments
 *
 * Routes:
 *   GET  /api/comments?claimId=:uuid  → flat list, newest-score-first (client nests)
 *   POST /api/comments                → create top-level or reply
 *   POST /api/comments/:id/vote       → set/clear an up/down vote
 *
 * Nesting: `parent_comment_id` is a self-ref. We return a FLAT array plus
 * `depth`, and let the client build the tree — one query instead of a
 * recursive CTE per level, and the client needs the flat map anyway for
 * optimistic updates.
 *
 * Vote counts are RECOMPUTED from `comment_votes` inside the transaction
 * rather than incremented, so a double-click can't drift the tally.
 *
 * Toxicity moderation: every new comment passes through Claude (default tier)
 * via `buildToxicityPrompt` + `toxicityVerdictSchema`. The verdict drives the
 *   - "block"  → 403, comment never persisted
 *   - "soften" → comment persists with `is_flagged=true`, response carries
 *                the `softened` rewrite so the composer can suggest it
 *   - "allow"  → comment persists as-is
 * On any AI failure the `toxicityFallback` ("allow") keeps the demo running.
 */
import { Router, type Request, type Response, type NextFunction } from 'express';
import { and, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/db';
import { AppError } from '@/middleware/errorHandler';
import {
  buildToxicityPrompt,
  generateStructured,
  toxicityFallback,
  toxicityVerdictSchema,
  type ToxicityVerdict,
} from '@/ai';

const router = Router();

function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    throw new AppError(401, 'You must be signed in.');
  }
  next();
}

/** Max nesting we return as real indentation; deeper replies flatten to this. */
const MAX_DEPTH = 5;

/* ── Schemas ─────────────────────────────────────────────────────────── */

const listQuerySchema = z.object({
  claimId: z.string().uuid('claimId must be a UUID.'),
});

const createSchema = z.object({
  claimId: z.string().uuid(),
  parentCommentId: z.string().uuid().nullish(),
  body: z.string().trim().min(1, 'Comment cannot be empty.').max(2000),
});

const voteSchema = z.object({
  /** 1 = upvote, -1 = downvote, 0 = clear existing vote */
  vote: z.union([z.literal(1), z.literal(-1), z.literal(0)]),
});

/* ── GET /api/comments?claimId= ──────────────────────────────────────── */
// Public: signed-out visitors can read a thread. `myVote` is only populated
// when authenticated.
router.get('/', async (req, res) => {
  const { claimId } = listQuerySchema.parse(req.query);
  const userId = req.isAuthenticated() ? (req.user as { id: string }).id : null;

  const rows = await db
    .select({
      id: schema.comments.id,
      claimId: schema.comments.claimId,
      parentCommentId: schema.comments.parentCommentId,
      body: schema.comments.body,
      isDeleted: schema.comments.isDeleted,
      isFlagged: schema.comments.isFlagged,
      upvotes: schema.comments.upvotes,
      downvotes: schema.comments.downvotes,
      createdAt: schema.comments.createdAt,
      userId: schema.comments.userId,
      authorName: schema.users.displayName,
      authorAvatarUrl: schema.users.avatarUrl,
      myVote: userId
        ? sql<number>`COALESCE((
            SELECT cv.vote FROM comment_votes cv
            WHERE cv.comment_id = ${schema.comments.id} AND cv.user_id = ${userId}
          ), 0)`.as('my_vote')
        : sql<number>`0`.as('my_vote'),
    })
    .from(schema.comments)
    .innerJoin(schema.users, eq(schema.users.id, schema.comments.userId))
    .where(eq(schema.comments.claimId, claimId))
    // Best-scored first at every level; ties break oldest-first so threads
    // read chronologically.
    .orderBy(
      sql`(${schema.comments.upvotes} - ${schema.comments.downvotes}) DESC`,
      schema.comments.createdAt
    );

  // Soft-deleted comments are kept as tombstones (they may have live replies)
  // but their body never leaves the server.
  const comments = rows.map((r) => ({
    ...r,
    body: r.isDeleted ? '[deleted]' : r.body,
    authorName: r.isDeleted ? '[deleted]' : r.authorName,
    authorAvatarUrl: r.isDeleted ? null : r.authorAvatarUrl,
  }));

  res.json({ comments, maxDepth: MAX_DEPTH });
});

/* ── POST /api/comments ──────────────────────────────────────────────── */
router.post('/', requireAuth, async (req, res) => {
  const userId = (req.user as { id: string }).id;
  const { claimId, parentCommentId, body } = createSchema.parse(req.body);

  // The claim must exist and be published — no commenting on drafts.
  const [claim] = await db
    .select({ id: schema.claims.id })
    .from(schema.claims)
    .where(and(eq(schema.claims.id, claimId), eq(schema.claims.isPublished, true)))
    .limit(1);
  if (!claim) throw new AppError(404, 'Claim not found.');

  // A reply's parent must exist AND belong to the same claim, otherwise a
  // crafted request could graft a reply from one thread onto another.
  if (parentCommentId) {
    const [parent] = await db
      .select({ id: schema.comments.id })
      .from(schema.comments)
      .where(
        and(eq(schema.comments.id, parentCommentId), eq(schema.comments.claimId, claimId))
      )
      .limit(1);
    if (!parent) throw new AppError(400, 'Parent comment does not belong to this claim.');
  }

  // ── AI toxicity moderation ─────────────────────────────────────────
  // Per `.ai/05-ai-prompts.md` §3: every new comment passes through Claude.
  // Uses the default (cheap) tier — short JSON verdict, single-digit ms
  // typical latency. On any AI failure, `toxicityFallback` returns
  // { decision: 'allow' } so the demo keeps running.
  const { system, prompt, userInput } = buildToxicityPrompt({ body });
  const verdict = await generateStructured<ToxicityVerdict>({
    system,
    prompt,
    userInput,
    schema: toxicityVerdictSchema,
    fallback: toxicityFallback,
    // Default tier — cheap, fast. The verdict is short JSON, so the strong
    // model's deeper reasoning isn't worth the latency here.
  });

  // Block before any DB write — refused comments never touch the schema.
  if (verdict.decision === 'block') {
    throw new AppError(
      422,
      `Comment blocked by community moderation: ${verdict.reason}`
    );
  }

  const isFlagged = verdict.decision === 'soften';
  const toxicityScore = verdict.decision === 'soften' ? 0.6 : 0;

  const [created] = await db
    .insert(schema.comments)
    .values({
      claimId,
      userId,
      parentCommentId: parentCommentId ?? null,
      body,
      toxicityScore,
      isFlagged,
    })
    .returning();

  const [author] = await db
    .select({ displayName: schema.users.displayName, avatarUrl: schema.users.avatarUrl })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);

  res.status(201).json({
    comment: {
      ...created,
      authorName: author?.displayName ?? 'Unknown',
      authorAvatarUrl: author?.avatarUrl ?? null,
      myVote: 0,
    },
    // Only present on 'soften' — composer surfaces it as a one-click
    // "use the kinder version instead" suggestion.
    moderation: {
      decision: verdict.decision,
      reason: verdict.reason,
      ...(verdict.softened ? { softened: verdict.softened } : {}),
    },
  });
});

/* ── POST /api/comments/:id/vote ─────────────────────────────────────── */
router.post('/:id/vote', requireAuth, async (req, res) => {
  const userId = (req.user as { id: string }).id;
  const commentId = z.string().uuid().parse(req.params.id);
  const { vote } = voteSchema.parse(req.body);

  const result = await db.transaction(async (tx) => {
    const [exists] = await tx
      .select({ id: schema.comments.id })
      .from(schema.comments)
      .where(eq(schema.comments.id, commentId))
      .limit(1);
    if (!exists) throw new AppError(404, 'Comment not found.');

    if (vote === 0) {
      await tx
        .delete(schema.commentVotes)
        .where(
          and(
            eq(schema.commentVotes.commentId, commentId),
            eq(schema.commentVotes.userId, userId)
          )
        );
    } else {
      await tx
        .insert(schema.commentVotes)
        .values({ userId, commentId, vote })
        .onConflictDoUpdate({
          target: [schema.commentVotes.userId, schema.commentVotes.commentId],
          set: { vote },
        });
    }

    // Recompute from source of truth — immune to double-submits.
    const [tally] = await tx
      .select({
        upvotes: sql<number>`COUNT(*) FILTER (WHERE ${schema.commentVotes.vote} = 1)`,
        downvotes: sql<number>`COUNT(*) FILTER (WHERE ${schema.commentVotes.vote} = -1)`,
      })
      .from(schema.commentVotes)
      .where(eq(schema.commentVotes.commentId, commentId));

    const upvotes = Number(tally?.upvotes ?? 0);
    const downvotes = Number(tally?.downvotes ?? 0);

    await tx
      .update(schema.comments)
      .set({ upvotes, downvotes, updatedAt: new Date() })
      .where(eq(schema.comments.id, commentId));

    return { id: commentId, upvotes, downvotes, myVote: vote };
  });

  res.json({ comment: result });
});

/* ── PATCH /api/comments/:id ────────────────────────────────────────── */
router.patch('/:id', requireAuth, async (req, res) => {
  const userId = (req.user as { id: string }).id;
  const commentId = z.string().uuid().parse(req.params.id);
  const { body } = createSchema.omit({ claimId: true, parentCommentId: true }).partial().parse(req.body);

  const [existing] = await db
    .select({ id: schema.comments.id, userId: schema.comments.userId, createdAt: schema.comments.createdAt })
    .from(schema.comments)
    .where(eq(schema.comments.id, commentId))
    .limit(1);

  if (!existing) throw new AppError(404, 'Comment not found.');
  if (existing.userId !== userId) throw new AppError(403, 'You can only edit your own comments.');

  // 5-minute edit window
  const createdAt = new Date(existing.createdAt).getTime();
  if (Date.now() - createdAt > 5 * 60 * 1000) {
    throw new AppError(403, 'Edit window has closed (5 minutes).');
  }

  const [updated] = await db
    .update(schema.comments)
    .set({ body, updatedAt: new Date() })
    .where(and(eq(schema.comments.id, commentId), eq(schema.comments.userId, userId)))
    .returning();

  res.json({ comment: updated });
});

/* ── DELETE /api/comments/:id ────────────────────────────────────────── */
router.delete('/:id', requireAuth, async (req, res) => {
  const userId = (req.user as { id: string }).id;
  const commentId = z.string().uuid().parse(req.params.id);

  const [existing] = await db
    .select({ id: schema.comments.id, userId: schema.comments.userId })
    .from(schema.comments)
    .where(eq(schema.comments.id, commentId))
    .limit(1);

  if (!existing) throw new AppError(404, 'Comment not found.');
  if (existing.userId !== userId) throw new AppError(403, 'You can only delete your own comments.');

  await db
    .update(schema.comments)
    .set({ isDeleted: true, updatedAt: new Date() })
    .where(and(eq(schema.comments.id, commentId), eq(schema.comments.userId, userId)));

  res.status(204).send();
});

export default router;
