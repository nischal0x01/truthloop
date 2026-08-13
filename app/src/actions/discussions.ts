/**
 * actions/discussions.ts — Standalone forum posts (separate from claim comments).
 *
 * Mirrors server schema:
 *   discussions table        → DiscussionPost
 *   discussion_comments table → DiscussionComment
 */

import { api } from '@/lib/api';
import { queryClient } from '@/providers';
import { shortTimeAgo } from './comments';

export { shortTimeAgo };

/* ── Types ── */

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

export interface DiscussionListResponse {
  posts: DiscussionPost[];
}

export interface DiscussionDetailResponse {
  post: DiscussionPost;
  comments: DiscussionComment[];
}

/* ── Query keys ── */

export const discussionKeys = {
  all: ['discussions'] as const,
  list: (sort?: SortOrder) => [...discussionKeys.all, 'list', sort ?? 'hot'] as const,
  detail: (id: string) => [...discussionKeys.all, 'detail', id] as const,
};

export const invalidateAllDiscussionQueries = () => {
  queryClient.invalidateQueries({ queryKey: discussionKeys.all });
};

/* ── Queries ── */

export const getDiscussionsQuery = (sort: SortOrder = 'hot') => ({
  queryKey: discussionKeys.list(sort),
  queryFn: async (): Promise<DiscussionListResponse> => {
    return api<DiscussionListResponse>(`/api/discussions?sort=${sort}`);
  },
});

export const getDiscussionByIdQuery = (id: string) => ({
  queryKey: discussionKeys.detail(id),
  queryFn: async (): Promise<DiscussionDetailResponse> => {
    return api<DiscussionDetailResponse>(`/api/discussions/${id}`);
  },
  // Don't fire for empty id — keeps the detail query from running while the
  // user is still on the list view.
  enabled: !!id,
});

/* ── Post mutations ── */

export const createDiscussionMutation = () => ({
  mutationFn: async (input: {
    title: string;
    body: string;
    imageUrl?: string | null;
  }): Promise<DiscussionPost> => {
    const { post } = await api<{ post: DiscussionPost }>('/api/discussions', {
      method: 'POST',
      body: input,
    });
    return post;
  },
  onSuccess: () => {
    invalidateAllDiscussionQueries();
  },
});

export const updateDiscussionMutation = () => ({
  mutationFn: async ({
    postId,
    title,
    body,
    imageUrl,
  }: {
    postId: string;
    title?: string;
    body?: string;
    imageUrl?: string | null;
  }): Promise<DiscussionPost> => {
    const { post } = await api<{ post: DiscussionPost }>(
      `/api/discussions/${postId}`,
      { method: 'PATCH', body: { title, body, imageUrl } }
    );
    return post;
  },
  onSuccess: () => {
    invalidateAllDiscussionQueries();
  },
});

export const deleteDiscussionMutation = () => ({
  mutationFn: async (postId: string): Promise<void> => {
    await api<void>(`/api/discussions/${postId}`, { method: 'DELETE' });
  },
  onSuccess: () => {
    invalidateAllDiscussionQueries();
  },
});

export const voteDiscussionMutation = () => ({
  mutationFn: async ({
    postId,
    vote,
  }: {
    postId: string;
    vote: DiscussionVoteValue;
  }): Promise<{
    id: string;
    upvotes: number;
    downvotes: number;
    myVote: DiscussionVoteValue;
  }> => {
    const { post } = await api<{
      post: { id: string; upvotes: number; downvotes: number; myVote: DiscussionVoteValue };
    }>(`/api/discussions/${postId}/vote`, {
      method: 'POST',
      body: { vote },
    });
    return post;
  },
});

/* ── Comment mutations ── */

export const createDiscussionCommentMutation = () => ({
  mutationFn: async (input: {
    discussionId: string;
    parentCommentId?: string | null;
    body: string;
  }): Promise<DiscussionComment> => {
    const { comment } = await api<{ comment: DiscussionComment }>(
      `/api/discussions/${input.discussionId}/comments`,
      {
        method: 'POST',
        body: { parentCommentId: input.parentCommentId, body: input.body },
      }
    );
    return comment;
  },
  onSuccess: () => {
    invalidateAllDiscussionQueries();
  },
});

export const updateDiscussionCommentMutation = () => ({
  mutationFn: async ({
    discussionId,
    commentId,
    body,
  }: {
    discussionId: string;
    commentId: string;
    body: string;
  }): Promise<DiscussionComment> => {
    const { comment } = await api<{ comment: DiscussionComment }>(
      `/api/discussions/${discussionId}/comments/${commentId}`,
      { method: 'PATCH', body: { body } }
    );
    return comment;
  },
  onSuccess: (_data: DiscussionComment, vars: { discussionId: string }) => {
    queryClient.invalidateQueries({
      queryKey: discussionKeys.detail(vars.discussionId),
    });
  },
});

export const deleteDiscussionCommentMutation = () => ({
  mutationFn: async ({
    discussionId,
    commentId,
  }: {
    discussionId: string;
    commentId: string;
  }): Promise<void> => {
    await api<void>(
      `/api/discussions/${discussionId}/comments/${commentId}`,
      { method: 'DELETE' }
    );
  },
  onSuccess: (_data: void, vars: { discussionId: string }) => {
    queryClient.invalidateQueries({
      queryKey: discussionKeys.detail(vars.discussionId),
    });
    invalidateAllDiscussionQueries();
  },
});

export const voteDiscussionCommentMutation = () => ({
  mutationFn: async ({
    commentId,
    vote,
    discussionId,
  }: {
    commentId: string;
    vote: DiscussionVoteValue;
    discussionId: string;
  }): Promise<{
    id: string;
    upvotes: number;
    downvotes: number;
    myVote: DiscussionVoteValue;
  }> => {
    const { comment } = await api<{
      comment: { id: string; upvotes: number; downvotes: number; myVote: DiscussionVoteValue };
    }>(`/api/discussions/${discussionId}/comments/${commentId}/vote`, {
      method: 'POST',
      body: { vote },
    });
    return comment;
  },
  onSuccess: (_data, vars) => {
    queryClient.invalidateQueries({
      queryKey: discussionKeys.detail(vars.discussionId),
    });
  },
});

/* ── Tree builder ── */

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