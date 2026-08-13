/**
 * actions/comments.ts — Comment threads on individual claims.
 *
 * The server returns a FLAT, pre-sorted array. `buildTree` nests it on the
 * client so we can also apply optimistic inserts without a refetch.
 */

import { api } from '@/lib/api';
import { queryClient } from '@/providers';

/* ── Types ── */

export interface Comment {
  id: string;
  claimId: string;
  parentCommentId: string | null;
  body: string;
  isDeleted: boolean;
  isFlagged: boolean;
  upvotes: number;
  downvotes: number;
  createdAt: string;
  userId: string;
  authorName: string;
  authorAvatarUrl: string | null;
  /** 1, -1, or 0 for the signed-in user. */
  myVote: number;
}

/** A comment plus its resolved children and indentation depth. */
export interface CommentNode extends Comment {
  depth: number;
  children: CommentNode[];
}

export type CommentVoteValue = 1 | -1 | 0;

export interface CommentListResponse {
  comments: Comment[];
  maxDepth: number;
}

/* ── Query keys ── */

export const commentKeys = {
  all: ['comments'] as const,
  forClaim: (claimId: string) => [...commentKeys.all, 'claim', claimId] as const,
};

export const invalidateAllCommentQueries = () => {
  queryClient.invalidateQueries({ queryKey: commentKeys.all });
};

/* ── Queries ── */

export const getCommentsQuery = (claimId: string) => ({
  queryKey: commentKeys.forClaim(claimId),
  queryFn: async (): Promise<CommentListResponse> => {
    return api<CommentListResponse>('/api/comments', {
      query: { claimId },
    });
  },
});

/* ── Mutations ── */

export const createCommentMutation = (claimId: string) => ({
  mutationFn: async (input: {
    parentCommentId?: string | null;
    body: string;
  }): Promise<Comment> => {
    const { comment } = await api<{ comment: Comment }>('/api/comments', {
      method: 'POST',
      body: { claimId, ...input },
    });
    return comment;
  },
});

export const updateCommentMutation = () => ({
  mutationFn: async ({
    commentId,
    body,
  }: {
    commentId: string;
    body: string;
  }): Promise<Comment> => {
    const { comment } = await api<{ comment: Comment }>(
      `/api/comments/${commentId}`,
      { method: 'PATCH', body: { body } }
    );
    return comment;
  },
});

export const deleteCommentMutation = () => ({
  mutationFn: async (commentId: string): Promise<void> => {
    await api<void>(`/api/comments/${commentId}`, { method: 'DELETE' });
  },
});

export const voteCommentMutation = () => ({
  mutationFn: async ({
    commentId,
    vote,
  }: {
    commentId: string;
    vote: CommentVoteValue;
  }): Promise<{ id: string; upvotes: number; downvotes: number; myVote: number }> => {
    const { comment } = await api<{
      comment: { id: string; upvotes: number; downvotes: number; myVote: number };
    }>(`/api/comments/${commentId}/vote`, {
      method: 'POST',
      body: { vote },
    });
    return comment;
  },
});

/* ── Flat → tree ── */

const DEFAULT_MAX_DEPTH = 5;

/**
 * Nest a flat comment list. Order within each level is preserved from the
 * server (score desc, then oldest first).
 *
 * Depth is capped at `maxDepth` so a 20-deep chain doesn't indent off-screen —
 * deeper replies keep their parent but render at the cap.
 *
 * Orphans (parent missing because it was hard-deleted) are promoted to
 * top-level rather than silently dropped, so no comment ever disappears.
 */
export function buildTree(
  comments: Comment[],
  maxDepth = DEFAULT_MAX_DEPTH
): CommentNode[] {
  const byId = new Map<string, CommentNode>();
  for (const c of comments) {
    byId.set(c.id, { ...c, depth: 0, children: [] });
  }

  const roots: CommentNode[] = [];
  for (const node of byId.values()) {
    const parent = node.parentCommentId ? byId.get(node.parentCommentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  // Assign depth iteratively — a cyclic parent chain (shouldn't happen, but a
  // bad migration could) would blow the stack in a recursive walk.
  const queue: CommentNode[] = roots.map((r) => {
    r.depth = 0;
    return r;
  });
  while (queue.length) {
    const node = queue.shift()!;
    for (const child of node.children) {
      child.depth = Math.min(node.depth + 1, maxDepth);
      queue.push(child);
    }
  }

  return roots;
}

/** Total comment count including replies. */
export function countComments(nodes: CommentNode[]): number {
  return nodes.reduce((sum, n) => sum + 1 + countComments(n.children), 0);
}

/* ── Relative time (short form, for dense threads) ── */

export function shortTimeAgo(iso: string): string {
  const diff = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.round(diff / 60)}m`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h`;
  if (diff < 604800) return `${Math.round(diff / 86400)}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}