/**
 * Discussions API + types — standalone forum posts (separate from claim comments).
 *
 * Types mirror the eventual server schema:
 *   discussions table → DiscussionPost
 *   discussion_comments table → DiscussionComment (reuses buildTree from comments.ts)
 *
 * Dummy data is provided for Phase 1 (frontend-only). When backend is implemented,
 * replace the dummy* exports with real API calls.
 */

import { api } from './api';
import { shortTimeAgo } from './comments';

export { shortTimeAgo };

/* ── Types ────────────────────────────────────────────────────────────────── */

export interface DiscussionPost {
  id: string;
  title: string;
  body: string;
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

/* ── API (Phase 2 — replace dummy implementations) ──────────────────────── */

export const discussionsApi = {
  list: (sort: SortOrder = 'hot') =>
    api<{ posts: DiscussionPost[] }>(`/api/discussions?sort=${sort}`),

  get: (id: string) =>
    api<{ post: DiscussionPost; comments: DiscussionComment[] }>(`/api/discussions/${id}`),

  create: (input: { title: string; body: string }) =>
    api<{ post: DiscussionPost }>('/api/discussions', { method: 'POST', body: input }),

  vote: (id: string, vote: DiscussionVoteValue) =>
    api<{ post: { id: string; upvotes: number; downvotes: number; myVote: DiscussionVoteValue } }>(
      `/api/discussions/${id}/vote`,
      { method: 'POST', body: { vote } }
    ),

  createComment: (input: { discussionId: string; parentCommentId?: string | null; body: string }) =>
    api<{ comment: DiscussionComment }>('/api/discussion-comments', { method: 'POST', body: input }),

  voteComment: (commentId: string, vote: DiscussionVoteValue) =>
    api<{ comment: { id: string; upvotes: number; downvotes: number; myVote: DiscussionVoteValue } }>(
      `/api/discussion-comments/${commentId}/vote`,
      { method: 'POST', body: { vote } }
    ),
} as const;

/* ── Query keys ───────────────────────────────────────────────────────────── */

export const discussionKeys = {
  all: ['discussions'] as const,
  list: (sort?: SortOrder) => [...discussionKeys.all, 'list', sort ?? 'hot'] as const,
  detail: (id: string) => [...discussionKeys.all, 'detail', id] as const,
};

/* ── Tree builder (adapted for DiscussionComment — has discussionId, not claimId) ── */

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

/* ── Dummy data (Phase 1 only) ───────────────────────────────────────────── */

const DUMMY_CURRENT_USER = {
  id: 'user-demo',
  displayName: 'You',
  avatarUrl: null,
};


const now = Date.now();
const ago = (mins: number) => new Date(now - mins * 60 * 1000).toISOString();

export const DUMMY_POSTS: DiscussionPost[] = [
  {
    id: 'post-1',
    title: 'How do you verify claims from unfamiliar sources?',
    body: "I've been fact-checking for a few weeks now and struggle when I encounter a claim from a region or topic I don't know well. What strategies do you use to quickly assess credibility?",
    authorId: 'user-1',
    authorName: 'Priya Sharma',
    authorAvatarUrl: null,
    createdAt: ago(45),
    upvotes: 24,
    downvotes: 2,
    commentCount: 8,
    myVote: 0,
  },
  {
    id: 'post-2',
    title: 'The difference between misleading and false claims',
    body: "A claim can be technically true but presented in a way that misleads. For example, citing a statistic without context. How do you categorize these in your mental model?",
    authorId: 'user-2',
    authorName: 'Rahul Verma',
    authorAvatarUrl: null,
    createdAt: ago(180),
    upvotes: 31,
    downvotes: 1,
    commentCount: 12,
    myVote: 0,
  },
  {
    id: 'post-3',
    title: 'Just earned the "Discussion Starter" badge! 🎉',
    body: "One of my comments hit 5 upvotes today. The community here is really engaged. Happy to be part of this.",
    authorId: 'user-3',
    authorName: 'Ananya Patel',
    authorAvatarUrl: null,
    createdAt: ago(360),
    upvotes: 18,
    downvotes: 0,
    commentCount: 5,
    myVote: 0,
  },
  {
    id: 'post-4',
    title: 'Tips for identifying manipulated statistics',
    body: "I've noticed three common patterns: (1) absolute vs relative risk, (2) cherry-picked time periods, (3) misleading样本 sizes. Anyone want to add to this list?",
    authorId: 'user-4',
    authorName: 'Vikram Singh',
    authorAvatarUrl: null,
    createdAt: ago(720),
    upvotes: 42,
    downvotes: 3,
    commentCount: 15,
    myVote: 0,
  },
  {
    id: 'post-5',
    title: 'Is satire harder to identify than we think?',
    body: "With AI-generated content on the rise, where do we draw the line between obvious satire and misinformation that looks real? Curious about others' perspectives.",
    authorId: 'user-5',
    authorName: 'Meera Kapoor',
    authorAvatarUrl: null,
    createdAt: ago(1440),
    upvotes: 56,
    downvotes: 7,
    commentCount: 23,
    myVote: 0,
  },
];

export const DUMMY_COMMENTS: Record<string, DiscussionComment[]> = {
  'post-1': [
    {
      id: 'dc-1-1',
      discussionId: 'post-1',
      parentCommentId: null,
      body: "I usually check the source's history and see if other fact-checkers have covered similar claims. Wikipedia is surprisingly helpful for background context.",
      isDeleted: false,
      isFlagged: false,
      upvotes: 8,
      downvotes: 0,
      createdAt: ago(40),
      userId: 'user-2',
      authorName: 'Rahul Verma',
      authorAvatarUrl: null,
      myVote: 0,
    },
    {
      id: 'dc-1-2',
      discussionId: 'post-1',
      parentCommentId: 'dc-1-1',
      body: "Wikipedia can be edited though — don't trust it as a primary source but great for finding primary sources.",
      isDeleted: false,
      isFlagged: false,
      upvotes: 5,
      downvotes: 0,
      createdAt: ago(38),
      userId: 'user-1',
      authorName: 'Priya Sharma',
      authorAvatarUrl: null,
      myVote: 0,
    },
    {
      id: 'dc-1-3',
      discussionId: 'post-1',
      parentCommentId: null,
      body: "For scientific claims, I look up the original paper on PubMed or Google Scholar. The abstract is usually enough to understand the methodology.",
      isDeleted: false,
      isFlagged: false,
      upvotes: 12,
      downvotes: 1,
      createdAt: ago(30),
      userId: 'user-4',
      authorName: 'Vikram Singh',
      authorAvatarUrl: null,
      myVote: 0,
    },
    {
      id: 'dc-1-4',
      discussionId: 'post-1',
      parentCommentId: 'dc-1-3',
      body: "This! And check if the study has been replicated. A single study with a small sample size isn't conclusive.",
      isDeleted: false,
      isFlagged: false,
      upvotes: 7,
      downvotes: 0,
      createdAt: ago(28),
      userId: 'user-5',
      authorName: 'Meera Kapoor',
      authorAvatarUrl: null,
      myVote: 0,
    },
  ],
  'post-2': [
    {
      id: 'dc-2-1',
      discussionId: 'post-2',
      parentCommentId: null,
      body: "I think the key is intent. A misleading claim might be technically true but leaves out crucial context — the person sharing it might not even realize it's misleading. A false claim is different.",
      isDeleted: false,
      isFlagged: false,
      upvotes: 15,
      downvotes: 0,
      createdAt: ago(170),
      userId: 'user-1',
      authorName: 'Priya Sharma',
      authorAvatarUrl: null,
      myVote: 0,
    },
    {
      id: 'dc-2-2',
      discussionId: 'post-2',
      parentCommentId: 'dc-2-1',
      body: "Intent is hard to determine from just the text though. That's why I focus on the effect the claim has rather than trying to guess intent.",
      isDeleted: false,
      isFlagged: false,
      upvotes: 9,
      downvotes: 0,
      createdAt: ago(165),
      userId: 'user-3',
      authorName: 'Ananya Patel',
      authorAvatarUrl: null,
      myVote: 0,
    },
  ],
  'post-4': [
    {
      id: 'dc-4-1',
      discussionId: 'post-4',
      parentCommentId: null,
      body: "(4) Using percentiles instead of actual numbers. 'You scored better than 90% of students' sounds great but tells us nothing about the absolute performance.",
      isDeleted: false,
      isFlagged: false,
      upvotes: 22,
      downvotes: 0,
      createdAt: ago(700),
      userId: 'user-3',
      authorName: 'Ananya Patel',
      authorAvatarUrl: null,
      myVote: 0,
    },
    {
      id: 'dc-4-2',
      discussionId: 'post-4',
      parentCommentId: null,
      body: "(5) Comparing to a different baseline than what the original study used. This is super common in nutrition research.",
      isDeleted: false,
      isFlagged: false,
      upvotes: 18,
      downvotes: 0,
      createdAt: ago(680),
      userId: 'user-5',
      authorName: 'Meera Kapoor',
      authorAvatarUrl: null,
      myVote: 0,
    },
  ],
};

/* ── Dummy API functions (Phase 1 — replace in Phase 2) ──────────────────── */

let _posts = [...DUMMY_POSTS];
let _comments: Record<string, DiscussionComment[]> = Object.fromEntries(
  Object.entries(DUMMY_COMMENTS).map(([k, v]) => [k, [...v]])
);

export const dummyDiscussionsApi = {
  list: (sort: SortOrder = 'hot'): Promise<{ posts: DiscussionPost[] }> =>
    new Promise((resolve) => {
      setTimeout(() => {
        let sorted = [..._posts];
        if (sort === 'new') {
          sorted = sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        } else if (sort === 'top') {
          sorted = sorted.sort((a, b) => (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes));
        } else {
          // hot: upvotes weighted by recency
          sorted = sorted.sort((a, b) => {
            const ageA = (now - new Date(a.createdAt).getTime()) / 3600000;
            const ageB = (now - new Date(b.createdAt).getTime()) / 3600000;
            const scoreA = a.upvotes / Math.pow(ageA + 2, 1.5);
            const scoreB = b.upvotes / Math.pow(ageB + 2, 1.5);
            return scoreB - scoreA;
          });
        }
        resolve({ posts: sorted });
      }, 300);
    }),

  get: (id: string): Promise<{ post: DiscussionPost; comments: DiscussionComment[] }> =>
    new Promise((resolve, reject) => {
      setTimeout(() => {
        const post = _posts.find((p) => p.id === id);
        if (!post) {
          reject(new Error('Post not found'));
          return;
        }
        resolve({ post, comments: _comments[id] ?? [] });
      }, 300);
    }),

  create: (input: { title: string; body: string }): Promise<{ post: DiscussionPost }> =>
    new Promise((resolve) => {
      setTimeout(() => {
        const newPost: DiscussionPost = {
          id: `post-${Date.now()}`,
          title: input.title,
          body: input.body,
          authorId: DUMMY_CURRENT_USER.id,
          authorName: DUMMY_CURRENT_USER.displayName,
          authorAvatarUrl: DUMMY_CURRENT_USER.avatarUrl,
          createdAt: new Date().toISOString(),
          upvotes: 1,
          downvotes: 0,
          commentCount: 0,
          myVote: 1,
        };
        _posts = [newPost, ..._posts];
        resolve({ post: newPost });
      }, 400);
    }),

  vote: (id: string, vote: DiscussionVoteValue): Promise<{ post: DiscussionPost }> =>
    new Promise((resolve) => {
      setTimeout(() => {
        _posts = _posts.map((p) => {
          if (p.id !== id) return p;
          const prev = p.myVote;
          const deltaUp = vote === 1 ? (prev === 1 ? -1 : 1) : 0;
          const deltaDown = vote === -1 ? (prev === -1 ? -1 : 1) : 0;
          return {
            ...p,
            myVote: vote === prev ? 0 : vote,
            upvotes: p.upvotes + deltaUp,
            downvotes: p.downvotes + deltaDown,
          };
        });
        const post = _posts.find((p) => p.id === id)!;
        resolve({ post });
      }, 200);
    }),

  createComment: (input: { discussionId: string; parentCommentId?: string | null; body: string }): Promise<{ comment: DiscussionComment }> =>
    new Promise((resolve) => {
      setTimeout(() => {
        const newComment: DiscussionComment = {
          id: `dc-${Date.now()}`,
          discussionId: input.discussionId,
          parentCommentId: input.parentCommentId ?? null,
          body: input.body,
          isDeleted: false,
          isFlagged: false,
          upvotes: 1,
          downvotes: 0,
          createdAt: new Date().toISOString(),
          userId: DUMMY_CURRENT_USER.id,
          authorName: DUMMY_CURRENT_USER.displayName,
          authorAvatarUrl: DUMMY_CURRENT_USER.avatarUrl,
          myVote: 1,
        };
        if (!_comments[input.discussionId]) _comments[input.discussionId] = [];
        _comments[input.discussionId] = [...(_comments[input.discussionId] ?? []), newComment];
        _posts = _posts.map((p) =>
          p.id === input.discussionId ? { ...p, commentCount: p.commentCount + 1 } : p
        );
        resolve({ comment: newComment });
      }, 400);
    }),

  voteComment: (commentId: string, vote: DiscussionVoteValue): Promise<{ comment: DiscussionComment }> =>
    new Promise((resolve) => {
      setTimeout(() => {
        for (const postId of Object.keys(_comments)) {
          const idx = _comments[postId].findIndex((c) => c.id === commentId);
          if (idx !== -1) {
            const c = _comments[postId][idx];
            const prev = c.myVote;
            const deltaUp = vote === 1 ? (prev === 1 ? -1 : 1) : 0;
            const deltaDown = vote === -1 ? (prev === -1 ? -1 : 1) : 0;
            _comments[postId][idx] = {
              ...c,
              myVote: vote === prev ? 0 : vote,
              upvotes: c.upvotes + deltaUp,
              downvotes: c.downvotes + deltaDown,
            };
            resolve({ comment: _comments[postId][idx] });
            return;
          }
        }
      }, 200);
    }),
};
