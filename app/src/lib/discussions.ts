/**
 * Discussions API + types — standalone forum posts (separate from claim comments).
 *
 * Types mirror the server schema:
 *   discussions table → DiscussionPost
 *   discussion_comments table → DiscussionComment
 */

import { api } from './api';
import { shortTimeAgo } from './comments';

export { shortTimeAgo };

/* ── Types ────────────────────────────────────────────────────────────────── */

export interface DiscussionPost {
  id: string;
  title: string;
  body: string;
  imageUrl: string | null;
  authorId: string;
  authorName: string;
  authorAvatarUrl: string | null;
  createdAt: string;
  upvotes: number;
  downvotes: number;
  commentCount: number;
  myVote: 1 | -1 | 0;
  isDeleted?: boolean;
}

export interface DiscussionComment {
  id: string;
  discussionId: string;
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
  myVote: 1 | -1 | 0;
}

export type DiscussionVoteValue = 1 | -1 | 0;

export type SortOrder = 'hot' | 'new' | 'top';

/* ── API ─────────────────────────────────────────────────────────────────── */

export const discussionsApi = {
  list: (sort: SortOrder = 'hot') =>
    api<{ posts: DiscussionPost[] }>(`/api/discussions?sort=${sort}`),

  get: (id: string) =>
    api<{ post: DiscussionPost; comments: DiscussionComment[] }>(`/api/discussions/${id}`),

  create: (input: { title: string; body: string; imageUrl?: string | null }) =>
    api<{ post: DiscussionPost }>('/api/discussions', { method: 'POST', body: input }),

  update: (id: string, input: { title?: string; body?: string; imageUrl?: string | null }) =>
    api<{ post: DiscussionPost }>(`/api/discussions/${id}`, { method: 'PATCH', body: input }),

  delete: (id: string) =>
    api<void>(`/api/discussions/${id}`, { method: 'DELETE' }),

  vote: (id: string, vote: DiscussionVoteValue) =>
    api<{ post: { id: string; upvotes: number; downvotes: number; myVote: DiscussionVoteValue } }>(
      `/api/discussions/${id}/vote`,
      { method: 'POST', body: { vote } }
    ),

  createComment: (input: { discussionId: string; parentCommentId?: string | null; body: string }) =>
    api<{ comment: DiscussionComment }>(`/api/discussions/${input.discussionId}/comments`, {
      method: 'POST',
      body: { parentCommentId: input.parentCommentId, body: input.body },
    }),

  updateComment: (discussionId: string, commentId: string, body: string) =>
    api<{ comment: DiscussionComment }>(
      `/api/discussions/${discussionId}/comments/${commentId}`,
      { method: 'PATCH', body: { body } }
    ),

  deleteComment: (discussionId: string, commentId: string) =>
    api<void>(`/api/discussions/${discussionId}/comments/${commentId}`, { method: 'DELETE' }),

  voteComment: (commentId: string, vote: DiscussionVoteValue, discussionId: string) =>
    api<{ comment: { id: string; upvotes: number; downvotes: number; myVote: DiscussionVoteValue } }>(
      `/api/discussions/${discussionId}/comments/${commentId}/vote`,
      { method: 'POST', body: { vote } }
    ),
} as const;

/* ── Query keys ───────────────────────────────────────────────────────────── */

export const discussionKeys = {
  all: ['discussions'] as const,
  list: (sort?: SortOrder) => [...discussionKeys.all, 'list', sort ?? 'hot'] as const,
  detail: (id: string) => [...discussionKeys.all, 'detail', id] as const,
};

/* ── Tree builder ─────────────────────────────────────────────────────────── */

export interface DiscussionCommentNode extends DiscussionComment {
  depth: number;
  children: DiscussionCommentNode[];
}

const DEFAULT_MAX_DEPTH = 5;

export function buildDiscussionTree(
  comments: DiscussionComment[],
  maxDepth = DEFAULT_MAX_DEPTH
): DiscussionCommentNode[] {
  const byId = new Map<string, DiscussionCommentNode>();
  for (const c of comments) {
    byId.set(c.id, { ...c, depth: 0, children: [] });
  }

  const roots: DiscussionCommentNode[] = [];
  for (const node of byId.values()) {
    const parent = node.parentCommentId ? byId.get(node.parentCommentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  const queue: DiscussionCommentNode[] = roots.map((r) => {
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

export function countDiscussionComments(nodes: DiscussionCommentNode[]): number {
  return nodes.reduce((sum, n) => sum + 1 + countDiscussionComments(n.children), 0);
}
