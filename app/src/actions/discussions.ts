/**
 * actions/discussions.ts — Standalone forum posts (separate from claim comments).
 *
 * Mirrors server schema:
 *   discussions table        → DiscussionPost
 *   discussion_comments table → DiscussionComment
 *
 * Cache strategy:
 *   Every mutation's `onSuccess` directly writes to the relevant query cache
 *   via `setQueryData` (synchronous, instant UI update). We do NOT rely on
 *   `invalidateQueries` alone — invalidation marks queries stale and triggers
 *   an async refetch, which leaves a 100–300ms window where the UI shows
 *   stale data and the user wonders if their action worked.
 *
 *   Each `onSuccess` writes to:
 *     1. The affected `detail` cache (always).
 *     2. The `list` cache for every sort variant — so flipping Hot/New/Top
 *        after a vote shows the updated tally without a refetch round-trip.
 *
 *   Pages can still layer their own `onSuccess` on top (e.g. toasts,
 *   navigation) — `useMutation` runs every onSuccess in the chain.
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

/* ── Cache helpers (mutate every sort variant of the list) ── */

/** Run `updater` against the list cache for every sort variant. */
function updateAllListCaches(
  updater: (old: DiscussionListResponse) => DiscussionListResponse
) {
  for (const sort of ['hot', 'new', 'top'] as const) {
    queryClient.setQueryData<DiscussionListResponse>(
      discussionKeys.list(sort),
      (old) => (old ? updater(old) : old)
    );
  }
}

/** Run `updater` against the detail cache for `id`. */
function updateDetailCache(
  id: string,
  updater: (old: DiscussionDetailResponse) => DiscussionDetailResponse
) {
  queryClient.setQueryData<DiscussionDetailResponse>(
    discussionKeys.detail(id),
    (old) => (old ? updater(old) : old)
  );
}

/** Apply a post-level patch to both the list cache (all sorts) and the
 *  detail cache for that post. */
function patchPost(
  postId: string,
  patch: (p: DiscussionPost) => DiscussionPost
) {
  updateAllListCaches((old) => ({
    posts: old.posts.map((p) => (p.id === postId ? patch(p) : p)),
  }));
  updateDetailCache(postId, (old) => ({ ...old, post: patch(old.post) }));
}

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
  onSuccess: (post) => {
    // Prepend to every sort's list cache so the new post shows up
    // immediately in whichever tab the user is on. The server's sort
    // algorithm will eventually reorder, but for the first few seconds the
    // user sees their own post — that's the only "real-time" signal that
    // matters for a UX-driven vote.
    updateAllListCaches((old) => ({ posts: [post, ...old.posts] }));
    // Also seed a detail cache so navigating to /discussions/:id is instant.
    queryClient.setQueryData<DiscussionDetailResponse>(
      discussionKeys.detail(post.id),
      { post, comments: [] }
    );
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
  onSuccess: (post) => {
    patchPost(post.id, () => post);
  },
});

export const deleteDiscussionMutation = () => ({
  mutationFn: async (postId: string): Promise<{ id: string }> => {
    await api<void>(`/api/discussions/${postId}`, { method: 'DELETE' });
    return { id: postId };
  },
  onSuccess: ({ id }) => {
    // Remove from every list cache so the post vanishes immediately.
    updateAllListCaches((old) => ({
      posts: old.posts.filter((p) => p.id !== id),
    }));
    // Drop the detail cache so navigating back to /discussions/:id refetches
    // and the server-side `isDeleted` flag wins.
    queryClient.removeQueries({ queryKey: discussionKeys.detail(id) });
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
  onSuccess: (result) => {
    patchPost(result.id, (p) => ({
      ...p,
      upvotes: result.upvotes,
      downvotes: result.downvotes,
      myVote: result.myVote,
    }));
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
  onSuccess: (comment, vars) => {
    // Append to detail cache so the new comment shows immediately.
    updateDetailCache(vars.discussionId, (old) => ({
      ...old,
      comments: [...old.comments, comment],
      post: { ...old.post, commentCount: old.post.commentCount + 1 },
    }));
    // Bump commentCount in the list cache for every sort.
    patchPost(vars.discussionId, (p) => ({
      ...p,
      commentCount: p.commentCount + 1,
    }));
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
  onSuccess: (comment, vars) => {
    updateDetailCache(vars.discussionId, (old) => ({
      ...old,
      comments: old.comments.map((c) =>
        c.id === comment.id ? { ...c, body: comment.body } : c
      ),
    }));
  },
});

export const deleteDiscussionCommentMutation = () => ({
  mutationFn: async ({
    discussionId,
    commentId,
  }: {
    discussionId: string;
    commentId: string;
  }): Promise<{ discussionId: string; commentId: string }> => {
    await api<void>(
      `/api/discussions/${discussionId}/comments/${commentId}`,
      { method: 'DELETE' }
    );
    return { discussionId, commentId };
  },
  onSuccess: ({ discussionId, commentId }) => {
    updateDetailCache(discussionId, (old) => ({
      ...old,
      comments: old.comments.map((c) =>
        c.id === commentId ? { ...c, isDeleted: true, body: '[deleted]' } : c
      ),
      post: {
        ...old.post,
        commentCount: Math.max(0, old.post.commentCount - 1),
      },
    }));
    patchPost(discussionId, (p) => ({
      ...p,
      commentCount: Math.max(0, p.commentCount - 1),
    }));
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
  onSuccess: (result, vars) => {
    updateDetailCache(vars.discussionId, (old) => ({
      ...old,
      comments: old.comments.map((c) =>
        c.id === result.id
          ? {
              ...c,
              upvotes: result.upvotes,
              downvotes: result.downvotes,
              myVote: result.myVote,
            }
          : c
      ),
    }));
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