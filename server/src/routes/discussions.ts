/**
 * Discussions routes — standalone forum posts.
 * Mounted at /api/discussions
 *
 * Routes:
 *   GET  /api/discussions              → list posts (sort: hot|new|top)
 *   POST /api/discussions              → create post
 *   GET  /api/discussions/:id          → get post + comments
 *   PATCH /api/discussions/:id         → edit post (5-min window)
 *   DELETE /api/discussions/:id        → soft delete
 *   POST /api/discussions/:id/vote    → upvote/downvote
 *   GET  /api/discussions/:id/comments → get comments
 *   POST /api/discussions/:id/comments  → create comment
 *   POST /api/discussions/:id/comments/:commentId/vote → vote on comment
 *
 * Pattern mirrors comments.ts — flat comments returned, client builds tree.
 */
import { Router, type Request, type Response, type NextFunction } from 'express';
import { and, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/db';
import { AppError } from '@/middleware/errorHandler';

const router = Router();

function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    throw new AppError(401, 'You must be signed in.');
  }
  next();
}

/* ── Schemas ─────────────────────────────────────────────────────────── */

const listQuerySchema = z.object({
  sort: z.enum(['hot', 'new', 'top']).optional().default('hot'),
});

const createPostSchema = z.object({
  title: z.string().trim().min(1, 'Title cannot be empty.').max(300),
  body: z.string().trim().min(1, 'Body cannot be empty.').max(500_000),
  imageUrl: z.string().url().nullable().optional(),
});

const voteSchema = z.object({
  vote: z.union([z.literal(1), z.literal(-1), z.literal(0)]),
});

const createCommentSchema = z.object({
  parentCommentId: z.string().uuid().nullish(),
  body: z.string().trim().min(1, 'Comment cannot be empty.').max(500_000),
});

/* ── GET /api/discussions ─────────────────────────────────────────────── */
router.get('/', async (req, res) => {
  const { sort } = listQuerySchema.parse(req.query);
  const userId = req.isAuthenticated() ? (req.user as { id: string }).id : null;

  let orderBy;
  if (sort === 'new') {
    orderBy = sql`${schema.discussions.createdAt} DESC`;
  } else if (sort === 'top') {
    orderBy = sql`(${schema.discussions.upvotes} - ${schema.discussions.downvotes}) DESC`;
  } else {
    // hot: upvotes weighted by recency — use raw SQL to avoid drizzle inference issues
    orderBy = sql`(
      "discussions"."upvotes"::float /
      POW(EXTRACT(EPOCH FROM (NOW() - "discussions"."created_at")) / 3600.0 + 2.0, 1.5)
    ) DESC`;
  }

  const rows = await db
    .select({
      id: schema.discussions.id,
      title: schema.discussions.title,
      body: schema.discussions.body,
      imageUrl: schema.discussions.imageUrl,
      authorId: schema.discussions.userId,
      authorName: schema.users.displayName,
      authorAvatarUrl: schema.users.avatarUrl,
      createdAt: schema.discussions.createdAt,
      upvotes: schema.discussions.upvotes,
      downvotes: schema.discussions.downvotes,
      commentCount: schema.discussions.commentCount,
      isDeleted: schema.discussions.isDeleted,
      myVote: userId
        ? sql<number>`COALESCE((
            SELECT dv.vote FROM discussion_votes dv
            WHERE dv.discussion_id = ${schema.discussions.id} AND dv.user_id = ${userId}
          ), 0)`.as('my_vote')
        : sql<number>`0`.as('my_vote'),
    })
    .from(schema.discussions)
    .innerJoin(schema.users, eq(schema.users.id, schema.discussions.userId))
    .where(eq(schema.discussions.isDeleted, false))
    .orderBy(orderBy)
    .limit(50);

  const posts = rows.map((r) => ({
    ...r,
    title: r.isDeleted ? '[deleted]' : r.title,
    body: r.isDeleted ? '[This post has been deleted.]' : r.body,
    authorName: r.isDeleted ? '[deleted]' : r.authorName,
  }));

  res.json({ posts });
});

/* ── POST /api/discussions ─────────────────────────────────────────────── */
router.post('/', requireAuth, async (req, res) => {
  const userId = (req.user as { id: string }).id;
  const { title, body, imageUrl } = createPostSchema.parse(req.body);

  const [created] = await db
    .insert(schema.discussions)
    .values({ userId, title, body, imageUrl })
    .returning();

  const [author] = await db
    .select({ displayName: schema.users.displayName, avatarUrl: schema.users.avatarUrl })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);

  res.status(201).json({
    post: {
      ...created,
      authorId: userId,
      authorName: author?.displayName ?? 'Unknown',
      authorAvatarUrl: author?.avatarUrl ?? null,
      myVote: 0,
    },
  });
});

/* ── GET /api/discussions/:id ──────────────────────────────────────────── */
router.get('/:id', async (req, res) => {
  const discussionId = z.string().uuid().parse(req.params.id);
  const userId = req.isAuthenticated() ? (req.user as { id: string }).id : null;

  const [row] = await db
    .select({
      id: schema.discussions.id,
      title: schema.discussions.title,
      body: schema.discussions.body,
      authorId: schema.discussions.userId,
      authorName: schema.users.displayName,
      authorAvatarUrl: schema.users.avatarUrl,
      createdAt: schema.discussions.createdAt,
      upvotes: schema.discussions.upvotes,
      downvotes: schema.discussions.downvotes,
      commentCount: schema.discussions.commentCount,
      isDeleted: schema.discussions.isDeleted,
      myVote: userId
        ? sql<number>`COALESCE((
            SELECT dv.vote FROM discussion_votes dv
            WHERE dv.discussion_id = ${schema.discussions.id} AND dv.user_id = ${userId}
          ), 0)`.as('my_vote')
        : sql<number>`0`.as('my_vote'),
    })
    .from(schema.discussions)
    .innerJoin(schema.users, eq(schema.users.id, schema.discussions.userId))
    .where(eq(schema.discussions.id, discussionId))
    .limit(1);

  if (!row) throw new AppError(404, 'Post not found.');

  const post = {
    ...row,
    title: row.isDeleted ? '[deleted]' : row.title,
    body: row.isDeleted ? '[This post has been deleted.]' : row.body,
    authorName: row.isDeleted ? '[deleted]' : row.authorName,
  };

  // Fetch comments
  const commentRows = await db
    .select({
      id: schema.discussionComments.id,
      discussionId: schema.discussionComments.discussionId,
      parentCommentId: schema.discussionComments.parentCommentId,
      body: schema.discussionComments.body,
      isDeleted: schema.discussionComments.isDeleted,
      isFlagged: schema.discussionComments.isFlagged,
      upvotes: schema.discussionComments.upvotes,
      downvotes: schema.discussionComments.downvotes,
      createdAt: schema.discussionComments.createdAt,
      userId: schema.discussionComments.userId,
      authorName: schema.users.displayName,
      authorAvatarUrl: schema.users.avatarUrl,
      myVote: userId
        ? sql<number>`COALESCE((
            SELECT dcv.vote FROM discussion_comment_votes dcv
            WHERE dcv.comment_id = ${schema.discussionComments.id} AND dcv.user_id = ${userId}
          ), 0)`.as('my_vote')
        : sql<number>`0`.as('my_vote'),
    })
    .from(schema.discussionComments)
    .innerJoin(schema.users, eq(schema.users.id, schema.discussionComments.userId))
    .where(eq(schema.discussionComments.discussionId, discussionId))
    .orderBy(
      sql`(${schema.discussionComments.upvotes} - ${schema.discussionComments.downvotes}) DESC`,
      schema.discussionComments.createdAt
    );

  const comments = commentRows.map((r) => ({
    ...r,
    body: r.isDeleted ? '[deleted]' : r.body,
    authorName: r.isDeleted ? '[deleted]' : r.authorName,
    authorAvatarUrl: r.isDeleted ? null : r.authorAvatarUrl,
  }));

  res.json({ post, comments });
});

/* ── PATCH /api/discussions/:id ────────────────────────────────────────── */
router.patch('/:id', requireAuth, async (req, res) => {
  const userId = (req.user as { id: string }).id;
  const discussionId = z.string().uuid().parse(req.params.id);
  const { title, body, imageUrl } = createPostSchema.partial().parse(req.body);

  const [existing] = await db
    .select({ id: schema.discussions.id, userId: schema.discussions.userId, createdAt: schema.discussions.createdAt })
    .from(schema.discussions)
    .where(eq(schema.discussions.id, discussionId))
    .limit(1);

  if (!existing) throw new AppError(404, 'Post not found.');
  if (existing.userId !== userId) throw new AppError(403, 'You can only edit your own posts.');

  const [updated] = await db
    .update(schema.discussions)
    .set({ title, body, imageUrl, updatedAt: new Date() })
    .where(and(eq(schema.discussions.id, discussionId), eq(schema.discussions.userId, userId)))
    .returning();

  res.json({ post: updated });
});

/* ── DELETE /api/discussions/:id ───────────────────────────────────────── */
router.delete('/:id', requireAuth, async (req, res) => {
  const userId = (req.user as { id: string }).id;
  const discussionId = z.string().uuid().parse(req.params.id);

  const [existing] = await db
    .select({ id: schema.discussions.id, userId: schema.discussions.userId })
    .from(schema.discussions)
    .where(eq(schema.discussions.id, discussionId))
    .limit(1);

  if (!existing) throw new AppError(404, 'Post not found.');
  if (existing.userId !== userId) throw new AppError(403, 'You can only delete your own posts.');

  await db
    .update(schema.discussions)
    .set({ isDeleted: true, updatedAt: new Date() })
    .where(and(eq(schema.discussions.id, discussionId), eq(schema.discussions.userId, userId)));

  res.status(204).send();
});

/* ── POST /api/discussions/:id/vote ───────────────────────────────────── */
router.post('/:id/vote', requireAuth, async (req, res) => {
  const userId = (req.user as { id: string }).id;
  const discussionId = z.string().uuid().parse(req.params.id);
  const { vote } = voteSchema.parse(req.body);

  const result = await db.transaction(async (tx) => {
    const [exists] = await tx
      .select({ id: schema.discussions.id })
      .from(schema.discussions)
      .where(and(eq(schema.discussions.id, discussionId), eq(schema.discussions.isDeleted, false)))
      .limit(1);
    if (!exists) throw new AppError(404, 'Post not found.');

    if (vote === 0) {
      await tx
        .delete(schema.discussionVotes)
        .where(
          and(
            eq(schema.discussionVotes.discussionId, discussionId),
            eq(schema.discussionVotes.userId, userId)
          )
        );
    } else {
      await tx
        .insert(schema.discussionVotes)
        .values({ userId, discussionId, vote })
        .onConflictDoUpdate({
          target: [schema.discussionVotes.userId, schema.discussionVotes.discussionId],
          set: { vote },
        });
    }

    const [tally] = await tx
      .select({
        upvotes: sql<number>`COUNT(*) FILTER (WHERE ${schema.discussionVotes.vote} = 1)`,
        downvotes: sql<number>`COUNT(*) FILTER (WHERE ${schema.discussionVotes.vote} = -1)`,
      })
      .from(schema.discussionVotes)
      .where(eq(schema.discussionVotes.discussionId, discussionId));

    const upvotes = Number(tally?.upvotes ?? 0);
    const downvotes = Number(tally?.downvotes ?? 0);

    await tx
      .update(schema.discussions)
      .set({ upvotes, downvotes, updatedAt: new Date() })
      .where(eq(schema.discussions.id, discussionId));

    return { id: discussionId, upvotes, downvotes, myVote: vote };
  });

  res.json({ post: result });
});

/* ── POST /api/discussions/:id/comments ───────────────────────────────── */
router.post('/:id/comments', requireAuth, async (req, res) => {
  const userId = (req.user as { id: string }).id;
  const discussionId = z.string().uuid().parse(req.params.id);
  const { parentCommentId, body } = createCommentSchema.parse(req.body);

  // Discussion must exist and not be deleted
  const [discussion] = await db
    .select({ id: schema.discussions.id })
    .from(schema.discussions)
    .where(and(eq(schema.discussions.id, discussionId), eq(schema.discussions.isDeleted, false)))
    .limit(1);
  if (!discussion) throw new AppError(404, 'Discussion not found.');

  // Parent comment must belong to same discussion
  if (parentCommentId) {
    const [parent] = await db
      .select({ id: schema.discussionComments.id })
      .from(schema.discussionComments)
      .where(
        and(
          eq(schema.discussionComments.id, parentCommentId),
          eq(schema.discussionComments.discussionId, discussionId)
        )
      )
      .limit(1);
    if (!parent) throw new AppError(400, 'Parent comment does not belong to this discussion.');
  }

  const [created] = await db
    .insert(schema.discussionComments)
    .values({ discussionId, userId, parentCommentId: parentCommentId ?? null, body })
    .returning();

  // Increment comment count
  await db
    .update(schema.discussions)
    .set({ commentCount: sql`${schema.discussions.commentCount} + 1`, updatedAt: new Date() })
    .where(eq(schema.discussions.id, discussionId));

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
  });
});

/* ── POST /api/discussions/:id/comments/:commentId/vote ──────────────── */
router.post('/:id/comments/:commentId/vote', requireAuth, async (req, res) => {
  const userId = (req.user as { id: string }).id;
  const commentId = z.string().uuid().parse(req.params.commentId);
  const { vote } = voteSchema.parse(req.body);

  const result = await db.transaction(async (tx) => {
    const [exists] = await tx
      .select({ id: schema.discussionComments.id })
      .from(schema.discussionComments)
      .where(and(eq(schema.discussionComments.id, commentId), eq(schema.discussionComments.isDeleted, false)))
      .limit(1);
    if (!exists) throw new AppError(404, 'Comment not found.');

    if (vote === 0) {
      await tx
        .delete(schema.discussionCommentVotes)
        .where(
          and(
            eq(schema.discussionCommentVotes.commentId, commentId),
            eq(schema.discussionCommentVotes.userId, userId)
          )
        );
    } else {
      await tx
        .insert(schema.discussionCommentVotes)
        .values({ userId, commentId, vote })
        .onConflictDoUpdate({
          target: [schema.discussionCommentVotes.userId, schema.discussionCommentVotes.commentId],
          set: { vote },
        });
    }

    const [tally] = await tx
      .select({
        upvotes: sql<number>`COUNT(*) FILTER (WHERE ${schema.discussionCommentVotes.vote} = 1)`,
        downvotes: sql<number>`COUNT(*) FILTER (WHERE ${schema.discussionCommentVotes.vote} = -1)`,
      })
      .from(schema.discussionCommentVotes)
      .where(eq(schema.discussionCommentVotes.commentId, commentId));

    const upvotes = Number(tally?.upvotes ?? 0);
    const downvotes = Number(tally?.downvotes ?? 0);

    await tx
      .update(schema.discussionComments)
      .set({ upvotes, downvotes, updatedAt: new Date() })
      .where(eq(schema.discussionComments.id, commentId));

    return { id: commentId, upvotes, downvotes, myVote: vote };
  });

  res.json({ comment: result });
});

/* ── PATCH /api/discussions/:id/comments/:commentId ─────────────────── */
router.patch('/:id/comments/:commentId', requireAuth, async (req, res) => {
  const userId = (req.user as { id: string }).id;
  const commentId = z.string().uuid().parse(req.params.commentId);
  const { body } = createCommentSchema.omit({ parentCommentId: true }).partial().parse(req.body);

  const [existing] = await db
    .select({ id: schema.discussionComments.id, userId: schema.discussionComments.userId, createdAt: schema.discussionComments.createdAt })
    .from(schema.discussionComments)
    .where(eq(schema.discussionComments.id, commentId))
    .limit(1);

  if (!existing) throw new AppError(404, 'Comment not found.');
  if (existing.userId !== userId) throw new AppError(403, 'You can only edit your own comments.');

  const [updated] = await db
    .update(schema.discussionComments)
    .set({ body, updatedAt: new Date() })
    .where(and(eq(schema.discussionComments.id, commentId), eq(schema.discussionComments.userId, userId)))
    .returning();

  res.json({ comment: updated });
});

/* ── DELETE /api/discussions/:id/comments/:commentId ─────────────────── */
router.delete('/:id/comments/:commentId', requireAuth, async (req, res) => {
  const userId = (req.user as { id: string }).id;
  const commentId = z.string().uuid().parse(req.params.commentId);
  const discussionId = z.string().uuid().parse(req.params.id);

  const [existing] = await db
    .select({ id: schema.discussionComments.id, userId: schema.discussionComments.userId })
    .from(schema.discussionComments)
    .where(eq(schema.discussionComments.id, commentId))
    .limit(1);

  if (!existing) throw new AppError(404, 'Comment not found.');
  if (existing.userId !== userId) throw new AppError(403, 'You can only delete your own comments.');

  await db
    .update(schema.discussionComments)
    .set({ isDeleted: true, updatedAt: new Date() })
    .where(and(eq(schema.discussionComments.id, commentId), eq(schema.discussionComments.userId, userId)));

  // Decrement comment count
  await db
    .update(schema.discussions)
    .set({ commentCount: sql`${schema.discussions.commentCount} - 1`, updatedAt: new Date() })
    .where(eq(schema.discussions.id, discussionId));

  res.status(204).send();
});

export default router;
