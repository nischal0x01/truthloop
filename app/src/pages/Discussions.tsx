/**
 * Discussions — standalone forum page (Reddit-style).
 *
 * Phase 1: Dummy data via dummyDiscussionsApi.
 * Phase 2: Replace dummyDiscussionsApi with discussionsApi (real API).
 *
 * Two views:
 *   - List view: all posts, sortable (Hot / New / Top)
 *   - Detail view: single post + nested comment thread
 */

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowUp,
  ArrowDown,
  MessageCircle,
  Plus,
  Minus,
  X,
  TrendingUp,
  Clock,
  Award,
  ChevronLeft,
} from 'lucide-react';
import { AppNav } from '@/components/AppNav';
import { UserAvatar } from '@/components/auth/UserAvatar';
import { CommentComposer } from '@/components/feed/CommentComposer';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import {
  dummyDiscussionsApi as discussionsApi,
  discussionKeys,
  type DiscussionPost,
  type DiscussionComment,
  type SortOrder,
  buildDiscussionTree,
  countDiscussionComments,
  shortTimeAgo,
  type DiscussionVoteValue,
} from '@/lib/discussions';

/* ── Page ─────────────────────────────────────────────────────────────────── */

export function Discussions() {
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [sort, setSort] = useState<SortOrder>('hot');
  const { user } = useAuth();

  // List query
  const listQuery = useQuery({
    queryKey: discussionKeys.list(sort),
    queryFn: () => discussionsApi.list(sort),
  });

  // Detail query (only when a post is selected)
  const detailQuery = useQuery({
    queryKey: discussionKeys.detail(selectedPostId ?? ''),
    queryFn: () => discussionsApi.get(selectedPostId!),
    enabled: !!selectedPostId,
  });

  const qc = useQueryClient();

  // Vote on post mutation
  const voteMutation = useMutation({
    mutationFn: ({ postId, vote }: { postId: string; vote: 1 | -1 | 0 }) =>
      discussionsApi.vote(postId, vote),
    onSuccess: (result) => {
      // Optimistically update the list
      qc.setQueryData(discussionKeys.list(sort), (old: { posts: DiscussionPost[] } | undefined) => {
        if (!old) return old;
        return {
          posts: old.posts.map((p) => (p.id === result.post.id ? result.post : p)),
        };
      });
      // Update detail if open
      if (selectedPostId === result.post.id) {
        qc.setQueryData(discussionKeys.detail(selectedPostId), (old: { post: DiscussionPost } | undefined) => {
          if (!old) return old;
          return { ...old, post: result.post };
        });
      }
    },
  });

  // Create post mutation
  const createPostMutation = useMutation({
    mutationFn: (input: { title: string; body: string }) => discussionsApi.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: discussionKeys.list() });
    },
  });

  // Create comment mutation
  const createCommentMutation = useMutation({
    mutationFn: (input: { discussionId: string; parentCommentId?: string | null; body: string }) =>
      discussionsApi.createComment(input),
    onSuccess: (_result, variables) => {
      qc.invalidateQueries({ queryKey: discussionKeys.detail(variables.discussionId) });
      qc.invalidateQueries({ queryKey: discussionKeys.list() });
    },
  });

  // Vote on comment mutation
  const voteCommentMutation = useMutation({
    mutationFn: ({ commentId, vote }: { commentId: string; vote: DiscussionVoteValue; discussionId: string }) =>
      discussionsApi.voteComment(commentId, vote),
    onSuccess: (_result, variables) => {
      qc.invalidateQueries({ queryKey: discussionKeys.detail(variables.discussionId) });
    },
  });

  const handleVotePost = useCallback(
    (postId: string, vote: 1 | -1 | 0) => {
      voteMutation.mutate({ postId, vote });
    },
    [voteMutation]
  );

  const handleVoteComment = useCallback(
    (commentId: string, vote: DiscussionVoteValue, discussionId: string) => {
      voteCommentMutation.mutate({ commentId, vote, discussionId });
    },
    [voteCommentMutation]
  );

  const handleCreateComment = useCallback(
    async (discussionId: string, parentCommentId: string | null, body: string) => {
      await createCommentMutation.mutateAsync({ discussionId, parentCommentId, body });
    },
    [createCommentMutation]
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppNav showClaims={true} />

      <main className="mx-auto max-w-3xl px-6 py-8">
        {/* Page header */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="flex items-center gap-1.5 text-label-small font-semibold uppercase tracking-wider text-foreground/70">
              <MessageCircle size={14} aria-hidden="true" />
              Community
            </p>
            <h1 className="mt-1 inline-block font-display text-display-medium font-semibold leading-[0.95] tracking-display text-foreground">
              Discussions
              <span
                aria-hidden="true"
                className="mt-2 block h-1.5 w-24 rounded-sm bg-accent"
              />
            </h1>
          </div>

          {user && <CreatePostButton onCreate={(t, b) => createPostMutation.mutate({ title: t, body: b })} isPending={createPostMutation.isPending} />}
        </div>

        {/* Sort tabs */}
        <SortTabs sort={sort} onSortChange={setSort} />

        {/* Content */}
        <AnimatePresence mode="wait">
          {!selectedPostId ? (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {listQuery.isLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <PostCardSkeleton key={i} />
                  ))}
                </div>
              ) : listQuery.data?.posts.length === 0 ? (
                <EmptyState onCreate={() => {/* open composer */}} />
              ) : (
                <div className="space-y-4">
                  {listQuery.data?.posts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      onSelect={() => setSelectedPostId(post.id)}
                      onVote={(v) => handleVotePost(post.id, v)}
                      isVoting={voteMutation.isPending && voteMutation.variables?.postId === post.id}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key={`detail-${selectedPostId}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {detailQuery.isLoading ? (
                <PostDetailSkeleton />
              ) : detailQuery.data ? (
                <PostDetail
                  post={detailQuery.data.post}
                  comments={detailQuery.data.comments}
                  onBack={() => setSelectedPostId(null)}
                  onVotePost={(v) => handleVotePost(detailQuery.data!.post.id, v)}
                  onVoteComment={(commentId, v) => handleVoteComment(commentId, v, detailQuery.data!.post.id)}
                  onReply={(parentId, body) => handleCreateComment(detailQuery.data!.post.id, parentId, body)}
                  isPostVoting={voteMutation.isPending && voteMutation.variables?.postId === detailQuery.data?.post.id}
                  canInteract={!!user}
                />
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

/* ── Sort tabs ─────────────────────────────────────────────────────────────── */

const SORT_OPTIONS: { value: SortOrder; label: string; icon: React.ReactNode }[] = [
  { value: 'hot', label: 'Hot', icon: <TrendingUp size={13} aria-hidden="true" /> },
  { value: 'new', label: 'New', icon: <Clock size={13} aria-hidden="true" /> },
  { value: 'top', label: 'Top', icon: <Award size={13} aria-hidden="true" /> },
];

function SortTabs({ sort, onSortChange }: { sort: SortOrder; onSortChange: (s: SortOrder) => void }) {
  return (
    <div className="mb-5 flex gap-2">
      {SORT_OPTIONS.map((opt) => {
        const isActive = sort === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onSortChange(opt.value)}
            className={[
              'inline-flex items-center gap-1.5 rounded-lg border-2 border-black px-3 py-1.5 text-label-small font-semibold transition-all hover-lift',
              isActive
                ? 'bg-pink-accent text-black shadow-hard-sm'
                : 'bg-card text-foreground shadow-hard-sm',
            ].join(' ')}
          >
            {opt.icon}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/* ── Post card ─────────────────────────────────────────────────────────────── */

interface PostCardProps {
  post: DiscussionPost;
  onSelect: () => void;
  onVote: (vote: 1 | -1 | 0) => void;
  isVoting?: boolean;
}

function PostCard({ post, onSelect, onVote, isVoting }: PostCardProps) {
  const score = post.upvotes - post.downvotes;
  const cast = (dir: 1 | -1) => {
    if (isVoting) return;
    onVote(post.myVote === dir ? 0 : dir);
  };

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="group cursor-pointer rounded-lg border-2 border-black bg-card shadow-hard-sm transition-all hover-lift"
      onClick={onSelect}
      aria-label={`Post: ${post.title}`}
    >
      <div className="flex gap-0">
        {/* Vote column */}
        <div
          className="flex w-14 flex-col items-center gap-1 border-r-2 border-black bg-yellow/10 py-4"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => cast(1)}
            disabled={isVoting}
            aria-label="Upvote"
            aria-pressed={post.myVote === 1}
            className={[
              'grid size-8 place-items-center rounded-md border-2 border-black transition-all',
              'hover:-translate-y-0.5 hover:shadow-hard-sm',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              post.myVote === 1
                ? 'bg-pink-accent text-black shadow-hard-sm'
                : 'bg-card hover:bg-pink-accent/40',
            ].join(' ')}
          >
            <ArrowUp size={14} strokeWidth={2.5} aria-hidden="true" />
          </button>

          <span
            className={[
              'text-label-small font-bold tabular-nums',
              score > 0 ? 'text-real' : score < 0 ? 'text-danger' : 'text-muted-foreground',
            ].join(' ')}
          >
            {score}
          </span>

          <button
            type="button"
            onClick={() => cast(-1)}
            disabled={isVoting}
            aria-label="Downvote"
            aria-pressed={post.myVote === -1}
            className={[
              'grid size-8 place-items-center rounded-md border-2 border-black transition-all',
              'hover:-translate-y-0.5 hover:shadow-hard-sm',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              post.myVote === -1
                ? 'bg-red text-white shadow-hard-sm'
                : 'bg-card hover:bg-red/20',
            ].join(' ')}
          >
            <ArrowDown size={14} strokeWidth={2.5} aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1 p-4">
          <h2 className="font-display text-heading-3 font-semibold leading-tight text-foreground group-hover:text-pink-accent">
            {post.title}
          </h2>
          <p className="mt-1.5 line-clamp-2 text-label text-foreground/80">
            {post.body}
          </p>

          <div className="mt-3 flex items-center justify-between gap-3">
            {/* Author + time */}
            <div className="flex items-center gap-2">
              <UserAvatar
                src={post.authorAvatarUrl}
                name={post.authorName}
                size={20}
                className="border border-black"
              />
              <span className="text-label-small font-medium">{post.authorName}</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-label-small text-muted-foreground">
                {shortTimeAgo(post.createdAt)}
              </span>
            </div>

            {/* Comment count */}
            <div className="flex items-center gap-1.5 text-label-small font-semibold text-orange">
              <MessageCircle size={13} aria-hidden="true" />
              <span>{post.commentCount}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

/* ── Post detail ───────────────────────────────────────────────────────────── */

interface PostDetailProps {
  post: DiscussionPost;
  comments: DiscussionComment[];
  onBack: () => void;
  onVotePost: (vote: 1 | -1 | 0) => void;
  onVoteComment: (commentId: string, vote: DiscussionVoteValue) => void;
  onReply: (parentCommentId: string | null, body: string) => Promise<void>;
  isPostVoting?: boolean;
  canInteract: boolean;
}

function PostDetail({
  post,
  comments,
  onBack,
  onVotePost,
  onVoteComment,
  onReply,
  isPostVoting,
  canInteract,
}: PostDetailProps) {
  const score = post.upvotes - post.downvotes;
  const tree = buildDiscussionTree(comments);

  const cast = (dir: 1 | -1) => {
    onVotePost(post.myVote === dir ? 0 : dir);
  };

  return (
    <div>
      {/* Back button */}
      <button
        type="button"
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1.5 rounded-lg border-2 border-black bg-yellow px-3 py-1.5 text-label-small font-semibold shadow-hard-sm transition-all hover-lift"
      >
        <ChevronLeft size={14} aria-hidden="true" />
        Back
      </button>

      {/* Post */}
      <article className="rounded-lg border-2 border-black bg-card shadow-hard">
        <div className="flex gap-0">
          {/* Vote column */}
          <div className="flex w-14 flex-col items-center gap-1 border-r-2 border-black bg-yellow/10 py-4">
            <button
              type="button"
              onClick={() => cast(1)}
              disabled={isPostVoting}
              aria-label="Upvote"
              aria-pressed={post.myVote === 1}
              className={[
                'grid size-8 place-items-center rounded-md border-2 border-black transition-all',
                'hover:-translate-y-0.5 hover:shadow-hard-sm',
                'disabled:opacity-50',
                post.myVote === 1
                  ? 'bg-pink-accent text-black shadow-hard-sm'
                  : 'bg-card hover:bg-pink-accent/40',
              ].join(' ')}
            >
              <ArrowUp size={14} strokeWidth={2.5} aria-hidden="true" />
            </button>

            <span
              className={[
                'text-label-small font-bold tabular-nums',
                score > 0 ? 'text-real' : score < 0 ? 'text-red' : 'text-muted-foreground',
              ].join(' ')}
            >
              {score}
            </span>

            <button
              type="button"
              onClick={() => cast(-1)}
              disabled={isPostVoting}
              aria-label="Downvote"
              aria-pressed={post.myVote === -1}
              className={[
                'grid size-8 place-items-center rounded-md border-2 border-black transition-all',
                'hover:-translate-y-0.5 hover:shadow-hard-sm',
                'disabled:opacity-50',
                post.myVote === -1
                  ? 'bg-red text-white shadow-hard-sm'
                  : 'bg-card hover:bg-red/20',
              ].join(' ')}
            >
              <ArrowDown size={14} strokeWidth={2.5} aria-hidden="true" />
            </button>
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1 p-5">
            <h1 className="font-display text-heading-2 font-semibold leading-tight text-foreground">
              {post.title}
            </h1>

            <div className="mt-2 flex items-center gap-2">
              <UserAvatar
                src={post.authorAvatarUrl}
                name={post.authorName}
                size={22}
                className="border border-black"
              />
              <span className="text-label font-medium">{post.authorName}</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-label-small text-muted-foreground">
                {shortTimeAgo(post.createdAt)}
              </span>
            </div>

            <p className="mt-4 text-label leading-relaxed text-foreground/90">{post.body}</p>
          </div>
        </div>
      </article>

      {/* Comment composer */}
      <div className="mt-5">
        {canInteract ? (
          <CommentComposer
            autoFocus={false}
            placeholder="Share your thoughts…"
            submitLabel="Post"
            onSubmit={async (body) => {
              await onReply(null, body);
            }}
          />
        ) : (
          <p className="text-center text-label-small text-muted-foreground">
            Sign in to join the discussion.
          </p>
        )}
      </div>

      {/* Comment thread */}
      {tree.length > 0 && (
        <div className="mt-6">
          <p className="mb-3 text-label-small font-bold uppercase tracking-wider text-orange">
            {countDiscussionComments(tree)} {countDiscussionComments(tree) === 1 ? 'comment' : 'comments'}
          </p>
          <DiscussionCommentThread
            nodes={tree}
            onVote={(commentId, vote) => onVoteComment(commentId, vote)}
            onReply={async (parentId, body) => {
              await onReply(parentId, body);
            }}
            canInteract={canInteract}
          />
        </div>
      )}
    </div>
  );
}

/* ── Create post button + modal ────────────────────────────────────────────── */

interface CreatePostButtonProps {
  onCreate: (title: string, body: string) => void;
  isPending: boolean;
}

function CreatePostButton({ onCreate, isPending }: CreatePostButtonProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const handleSubmit = async () => {
    if (!title.trim() || !body.trim()) return;
    await onCreate(title.trim(), body.trim());
    setTitle('');
    setBody('');
    setOpen(false);
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="bg-accent text-accent-foreground border-2 border-black rounded-lg shadow-hard hover-lift gap-1.5"
      >
        <Plus size={15} aria-hidden="true" />
        New Post
      </Button>

      <AnimatePresence>
        {open && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-6"
              role="dialog"
              aria-modal="true"
              aria-label="Create new post"
            >
              <div className="w-full max-w-lg rounded-2xl border-2 border-black bg-card shadow-hard-lg">
                {/* Header */}
                <div className="flex items-center justify-between border-b-2 border-black px-5 py-4">
                  <h2 className="font-display text-heading-3 font-semibold">New Discussion</h2>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="grid size-8 place-items-center rounded-lg border-2 border-black bg-card shadow-hard-sm transition-all hover:bg-muted"
                    aria-label="Close"
                  >
                    <X size={15} aria-hidden="true" />
                  </button>
                </div>

                {/* Form */}
                <div className="space-y-4 p-5">
                  <div>
                    <label
                      htmlFor="post-title"
                      className="mb-1.5 block text-label-small font-semibold"
                    >
                      Title
                    </label>
                    <input
                      id="post-title"
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="What do you want to discuss?"
                      maxLength={300}
                      className="w-full rounded-lg border-2 border-black bg-card px-3 py-2.5 text-label shadow-hard-sm outline-none focus:ring-2 focus:ring-black placeholder:text-muted-foreground"
                    />
                    <p className="mt-1 text-right text-[11px] tabular-nums text-muted-foreground">
                      {title.length}/300
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="post-body"
                      className="mb-1.5 block text-label-small font-semibold"
                    >
                      Body
                    </label>
                    <textarea
                      id="post-body"
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      placeholder="Share your thoughts, questions, or insights…"
                      rows={5}
                      maxLength={2000}
                      className="w-full resize-y rounded-lg border-2 border-black bg-card px-3 py-2.5 text-label shadow-hard-sm outline-none focus:ring-2 focus:ring-black placeholder:text-muted-foreground"
                    />
                    <p className="mt-1 text-right text-[11px] tabular-nums text-muted-foreground">
                      {body.length}/2000
                    </p>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 border-t-2 border-black px-5 py-4">
                  <Button
                    variant="outline"
                    onClick={() => setOpen(false)}
                    className="border-2 border-black rounded-lg shadow-hard-sm"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => void handleSubmit()}
                    disabled={!title.trim() || !body.trim() || isPending}
                    className="bg-accent text-accent-foreground border-2 border-black rounded-lg shadow-hard hover-lift gap-1.5"
                  >
                    {isPending ? 'Posting…' : 'Post Discussion'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

/* ── Skeletons ─────────────────────────────────────────────────────────────── */

function PostCardSkeleton() {
  return (
    <div className="rounded-lg border-2 border-black bg-card shadow-hard-sm p-4">
      <div className="flex gap-3">
        <div className="w-14 border-r-2 border-black pr-3">
          <div className="mx-auto size-8 rounded-md bg-muted animate-pulse" />
          <div className="mx-auto mt-1.5 h-4 w-6 rounded bg-muted animate-pulse" />
          <div className="mx-auto mt-1.5 size-8 rounded-md bg-muted animate-pulse" />
        </div>
        <div className="flex-1 space-y-2">
          <div className="h-5 w-3/4 rounded bg-muted animate-pulse" />
          <div className="h-4 w-full rounded bg-muted animate-pulse" />
          <div className="h-4 w-2/3 rounded bg-muted animate-pulse" />
          <div className="mt-3 flex gap-2">
            <div className="size-5 rounded-full bg-muted animate-pulse" />
            <div className="h-4 w-24 rounded bg-muted animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

function PostDetailSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-10 w-24 rounded-lg bg-muted animate-pulse" />
      <div className="rounded-lg border-2 border-black bg-card p-5 shadow-hard">
        <div className="flex gap-3">
          <div className="w-14 border-r-2 border-black pr-3">
            <div className="mx-auto size-8 rounded-md bg-muted animate-pulse" />
            <div className="mx-auto mt-1.5 h-4 w-6 rounded bg-muted animate-pulse" />
            <div className="mx-auto mt-1.5 size-8 rounded-md bg-muted animate-pulse" />
          </div>
          <div className="flex-1 space-y-3">
            <div className="h-7 w-full rounded bg-muted animate-pulse" />
            <div className="flex gap-2">
              <div className="size-6 rounded-full bg-muted animate-pulse" />
              <div className="h-4 w-32 rounded bg-muted animate-pulse" />
            </div>
            <div className="h-20 w-full rounded bg-muted animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Discussion comment thread ─────────────────────────────────────────────── */

const DEPTH_COLORS = [
  'border-pink-accent',
  'border-orange',
  'border-red',
  'border-yellow',
  'border-real',
];

interface DiscussionCommentThreadProps {
  nodes: import('@/lib/discussions').DiscussionCommentNode[];
  onVote: (commentId: string, vote: DiscussionVoteValue) => void;
  onReply: (parentCommentId: string, body: string) => Promise<void>;
  canInteract: boolean;
}

export function DiscussionCommentThread({ nodes, onVote, onReply, canInteract }: DiscussionCommentThreadProps) {
  return (
    <ul className="space-y-3" role="list">
      {nodes.map((node) => (
        <DiscussionCommentItem
          key={node.id}
          node={node}
          onVote={onVote}
          onReply={onReply}
          canInteract={canInteract}
          depth={0}
        />
      ))}
    </ul>
  );
}

interface DiscussionCommentItemProps {
  node: import('@/lib/discussions').DiscussionCommentNode;
  onVote: (commentId: string, vote: DiscussionVoteValue) => void;
  onReply: (parentCommentId: string, body: string) => Promise<void>;
  canInteract: boolean;
  depth: number;
}

function DiscussionCommentItem({ node, onVote, onReply, canInteract, depth }: DiscussionCommentItemProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [replying, setReplying] = useState(false);

  const score = node.upvotes - node.downvotes;
  const hasKids = node.children.length > 0;
  const railColor = DEPTH_COLORS[depth % DEPTH_COLORS.length];

  const cast = (dir: 1 | -1) => onVote(node.id, node.myVote === dir ? 0 : dir);

  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="relative"
    >
      {depth > 0 && (
        <div
          className={['absolute left-0 top-0 bottom-0 w-1 rounded-full', railColor].join(' ')}
          style={{ opacity: 0.6 }}
          aria-hidden="true"
        />
      )}

      <div className={['rounded-lg border-2 border-black bg-card transition-colors', node.isFlagged ? 'bg-warning/20' : ''].join(' ')}>
        <div className="flex gap-3 p-3">
          {/* Vote column */}
          <div className="flex flex-col items-center gap-1 shrink-0">
            <button
              type="button"
              disabled={!canInteract || node.isDeleted}
              onClick={() => cast(1)}
              aria-label="Upvote"
              aria-pressed={node.myVote === 1}
              className={[
                'grid size-8 place-items-center rounded-md border-2 border-black transition-all',
                'hover:-translate-y-0.5 hover:shadow-hard-sm',
                'disabled:cursor-not-allowed disabled:opacity-40',
                node.myVote === 1 ? 'bg-pink-accent text-black shadow-hard-sm' : 'bg-card hover:bg-pink-accent/40',
              ].join(' ')}
            >
              <ArrowUp size={14} strokeWidth={2.5} aria-hidden="true" />
            </button>

            <span className={['text-label-small font-bold tabular-nums', score > 0 ? 'text-real' : score < 0 ? 'text-red' : 'text-muted-foreground'].join(' ')}>
              {score}
            </span>

            <button
              type="button"
              disabled={!canInteract || node.isDeleted}
              onClick={() => cast(-1)}
              aria-label="Downvote"
              aria-pressed={node.myVote === -1}
              className={[
                'grid size-8 place-items-center rounded-md border-2 border-black transition-all',
                'hover:-translate-y-0.5 hover:shadow-hard-sm',
                'disabled:cursor-not-allowed disabled:opacity-40',
                node.myVote === -1 ? 'bg-red text-white shadow-hard-sm' : 'bg-card hover:bg-red/20',
              ].join(' ')}
            >
              <ArrowDown size={14} strokeWidth={2.5} aria-hidden="true" />
            </button>
          </div>

          {/* Body column */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              {!node.isDeleted ? (
                <>
                  <UserAvatar src={node.authorAvatarUrl} name={node.authorName} size={24} className="border border-black" />
                  <span className="text-label font-semibold truncate">{node.authorName}</span>
                </>
              ) : (
                <span className="text-label text-muted-foreground italic">[deleted]</span>
              )}
              <span className="text-muted-foreground">·</span>
              <span className="text-label-small text-muted-foreground shrink-0">{shortTimeAgo(node.createdAt)}</span>
            </div>

            <p className={['mt-2 text-label leading-relaxed', node.isDeleted ? 'text-muted-foreground italic' : 'text-foreground/90'].join(' ')} style={{ overflowWrap: 'anywhere' }}>
              {node.isDeleted ? '[This comment has been deleted]' : node.body}
            </p>

            {canInteract && !node.isDeleted && (
              <div className="mt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setReplying((r) => !r)}
                  className={['inline-flex items-center gap-1.5 rounded-md border-2 border-black px-2 py-1 text-label-small font-medium transition-all', replying ? 'bg-orange text-black shadow-hard-sm' : 'bg-card hover:bg-orange/30 hover:-translate-y-0.5 hover:shadow-hard-sm'].join(' ')}
                >
                  Reply
                </button>
                {hasKids && (
                  <button
                    type="button"
                    onClick={() => setCollapsed((c) => !c)}
                    className={['inline-flex items-center gap-1.5 rounded-md border-2 border-black px-2 py-1 text-label-small font-medium transition-all', collapsed ? 'bg-card hover:bg-muted' : 'bg-yellow hover:bg-yellow/80'].join(' ')}
                  >
                    {collapsed ? <Plus size={12} aria-hidden="true" /> : <Minus size={12} aria-hidden="true" />}
                    <span>{collapsed ? 'Show' : 'Hide'} {node.children.length} {node.children.length === 1 ? 'reply' : 'replies'}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Reply composer */}
        <AnimatePresence>
          {replying && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <div className="border-t-2 border-black bg-muted/30 px-3 py-3">
                <CommentComposer
                  autoFocus
                  placeholder={`Reply to ${node.authorName}…`}
                  submitLabel="Reply"
                  onSubmit={async (body) => {
                    await onReply(node.id, body);
                    setReplying(false);
                  }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Children */}
      <AnimatePresence>
        {hasKids && !collapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <ul className={['mt-3 space-y-3 border-l-2 pl-4', railColor].join(' ')} style={{ borderLeftWidth: '3px' }} role="list">
              {node.children.map((child) => (
                <DiscussionCommentItem
                  key={child.id}
                  node={child}
                  onVote={onVote}
                  onReply={onReply}
                  canInteract={canInteract}
                  depth={depth + 1}
                />
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
}

/* ── Empty state ───────────────────────────────────────────────────────────── */

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="rounded-lg border-2 border-black bg-card p-10 text-center shadow-hard">
      <div className="mx-auto grid size-12 place-items-center rounded-lg border-2 border-black bg-accent">
        <MessageCircle size={22} strokeWidth={2} aria-hidden="true" />
      </div>
      <p className="mt-4 font-display text-heading-3 font-semibold">No discussions yet</p>
      <p className="mt-2 text-label text-foreground/70">
        Be the first to start a conversation!
      </p>
      <Button
        onClick={onCreate}
        className="mt-5 bg-accent text-accent-foreground border-2 border-black rounded-lg shadow-hard hover-lift gap-1.5"
      >
        <Plus size={15} aria-hidden="true" />
        Start a Discussion
      </Button>
    </div>
  );
}
