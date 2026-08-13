/**
 * Discussions — standalone forum page (Reddit-style).
 *
 * URL-based routing:
 *   - /discussions       — list view (sortable: Hot / New / Top)
 *   - /discussions/:id   — detail view (single post + nested comments)
 *
 * This page owns:
 *   - Routing + URL sync
 *   - React Query (list, detail)
 *   - Mutations (vote, create, update, delete on posts + comments)
 *   - Toast notification queue
 *   - Keyboard shortcut for Escape
 *
 * All presentational sub-components live under @/components/discussions/:
 *   - SortTabs              → Hot / New / Top selector
 *   - CreatePostButton      → trigger + modal for new posts
 *   - PostCard              → single post in the list view (+ skeleton)
 *   - PostDetail            → full post + comment thread view (+ skeleton)
 *   - DiscussionCommentThread → nested comments under a post (used inside PostDetail)
 *   - EmptyState            → shown when the list has zero posts
 *   - ToastContainer        → bottom-right notification stack
 *   - VoteArrow             → shared up/down arrow used in posts + comments
 */

/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V4 */

import { useCallback, useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle } from 'lucide-react';
import { AppNav } from '@/components/AppNav';
import { CreatePostButton } from '@/components/discussions/CreatePostButton';
import { EmptyState } from '@/components/discussions/EmptyState';
import { PostCard, PostCardSkeleton } from '@/components/discussions/PostCard';
import { PostDetail, PostDetailSkeleton } from '@/components/discussions/PostDetail';
import { SortTabs } from '@/components/discussions/SortTabs';
import { ToastContainer, type Toast } from '@/components/discussions/Toast';
import { useAuth } from '@/contexts/auth-context';
import {
  getDiscussionsQuery,
  getDiscussionByIdQuery,
  createDiscussionMutation,
  updateDiscussionMutation,
  deleteDiscussionMutation,
  voteDiscussionMutation,
  createDiscussionCommentMutation,
  voteDiscussionCommentMutation,
  updateDiscussionCommentMutation,
  deleteDiscussionCommentMutation,
  type DiscussionPost,
  type SortOrder,
} from '@/actions/discussions';
import { EASE } from '@/lib/motion';

export function Discussions() {
  const { id: postIdFromUrl } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const [sort, setSort] = useState<SortOrder>('hot');
  const [editOnMountId, setEditOnMountId] = useState<string | null>(null);
  const [openComposer, setOpenComposer] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const { user } = useAuth();

  const selectedPostId = postIdFromUrl ?? null;

  const showToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Escape closes the detail view
  useEffect(() => {
    if (!selectedPostId) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') navigate('/discussions', { replace: true });
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPostId, navigate]);

  /* ── Queries (factories from actions/discussions.ts) ── */

  const listQuery = useQuery(getDiscussionsQuery(sort));

  const detailQuery = useQuery({
    ...getDiscussionByIdQuery(selectedPostId ?? ''),
    // getDiscussionByIdQuery already gates on `!!id`, but we re-affirm it here
    // so the disabled-vs-idle state stays explicit at the call site.
    enabled: !!selectedPostId,
  });

  /* ── Mutations (factories from actions/discussions.ts) ──
   *
   * IMPORTANT: every action's `onSuccess` does direct setQueryData writes so
   * the UI updates synchronously. The page must NOT override `onSuccess` —
   * doing so would silently replace the cache update and the user would see
   * stale data until the next refetch. Toasts and navigation live in the
   * handlers below (after `mutateAsync`) so the action's onSuccess always
   * runs untouched.
   */

  const voteMutation = useMutation(voteDiscussionMutation());

  const createPostMutation = useMutation(createDiscussionMutation());

  const updatePostMutation = useMutation(updateDiscussionMutation());

  const deletePostMutation = useMutation(deleteDiscussionMutation());

  const createCommentMutation = useMutation(createDiscussionCommentMutation());

  const voteCommentMutation = useMutation(voteDiscussionCommentMutation());

  const updateCommentMutation = useMutation(updateDiscussionCommentMutation());

  const deleteCommentMutation = useMutation(deleteDiscussionCommentMutation());

  /* ── Handlers ──
   *
   * Each handler calls `mutateAsync` so we can chain UX work (toast /
   * navigate) AFTER the mutation's cache update has already been applied
   * by the action's `onSuccess`. If we did `mutate(..., { onSuccess })`
   * here, the action's onSuccess would still run, but having all UX work
   * centralised in handlers keeps the page readable.
   */

  const handleCreatePost = useCallback(
    async (title: string, body: string) => {
      try {
        await createPostMutation.mutateAsync({ title, body });
        showToast('Discussion posted!');
      } catch (err) {
        showToast(
          err instanceof Error ? err.message : 'Failed to post discussion.',
          'error'
        );
      }
    },
    [createPostMutation, showToast]
  );

  const handleUpdatePost = useCallback(
    async (postId: string, title: string, body: string) => {
      try {
        await updatePostMutation.mutateAsync({ postId, title, body });
        showToast('Changes saved!');
        navigate('/discussions', { replace: true });
      } catch (err) {
        showToast(
          err instanceof Error ? err.message : 'Failed to save changes.',
          'error'
        );
      }
    },
    [updatePostMutation, showToast, navigate]
  );

  const handleDeletePost = useCallback(
    async (postId: string) => {
      if (!window.confirm('Are you sure you want to delete this post?')) return;
      try {
        await deletePostMutation.mutateAsync(postId);
        showToast('Discussion deleted');
        navigate('/discussions', { replace: true });
      } catch (err) {
        showToast(
          err instanceof Error ? err.message : 'Failed to delete discussion.',
          'error'
        );
      }
    },
    [deletePostMutation, showToast, navigate]
  );

  const handleVotePost = useCallback(
    (postId: string, vote: 1 | -1 | 0) => voteMutation.mutate({ postId, vote }),
    [voteMutation]
  );

  const handleVoteComment = useCallback(
    (commentId: string, vote: 1 | -1 | 0, discussionId: string) =>
      voteCommentMutation.mutate({ commentId, vote, discussionId }),
    [voteCommentMutation]
  );

  const handleCreateComment = useCallback(
    async (discussionId: string, parentCommentId: string | null, body: string) => {
      try {
        await createCommentMutation.mutateAsync({
          discussionId,
          parentCommentId,
          body,
        });
        showToast('Comment posted!');
      } catch (err) {
        showToast(
          err instanceof Error ? err.message : 'Failed to post comment.',
          'error'
        );
      }
    },
    [createCommentMutation, showToast]
  );

  const handleUpdateComment = useCallback(
    async (discussionId: string, commentId: string, body: string) => {
      try {
        await updateCommentMutation.mutateAsync({
          discussionId,
          commentId,
          body,
        });
        showToast('Comment updated!');
      } catch (err) {
        showToast(
          err instanceof Error ? err.message : 'Failed to update comment.',
          'error'
        );
      }
    },
    [updateCommentMutation, showToast]
  );

  const handleDeleteComment = useCallback(
    async (discussionId: string, commentId: string) => {
      if (!window.confirm('Delete this comment?')) return;
      try {
        await deleteCommentMutation.mutateAsync({ discussionId, commentId });
        showToast('Comment deleted');
      } catch (err) {
        showToast(
          err instanceof Error ? err.message : 'Failed to delete comment.',
          'error'
        );
      }
    },
    [deleteCommentMutation, showToast]
  );

  const handleEditPost = useCallback(
    (post: DiscussionPost) => {
      navigate(`/discussions/${post.id}`, { replace: true });
      setEditOnMountId(post.id);
    },
    [navigate]
  );

  const handleBack = useCallback(() => {
    navigate('/discussions', { replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppNav showClaims={true} />

      <main className="mx-auto max-w-3xl px-6 py-8">
        {/* Page header */}
        <motion.div
          className="mb-6 flex items-end justify-between gap-4"
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
          }}
        >
          <div>
            <motion.p
              variants={{
                hidden: { opacity: 0, y: 6 },
                show: { opacity: 1, y: 0 },
              }}
              transition={{ duration: 0.5, ease: EASE }}
              className="flex items-center gap-1.5 text-label-small font-semibold uppercase tracking-wider text-foreground/70"
            >
              <MessageCircle size={14} aria-hidden="true" />
              Community
            </motion.p>
            <h1 className="relative mt-1 inline-block font-display text-display-medium font-semibold leading-[0.95] tracking-display text-foreground">
              <span className="relative inline-block overflow-hidden align-baseline">
                <motion.span
                  className="inline-block"
                  variants={{
                    hidden: { y: '110%', opacity: 0 },
                    show: { y: '0%', opacity: 1 },
                  }}
                  transition={{ duration: 0.8, ease: EASE, delay: 0.1 }}
                >
                  Discussions
                </motion.span>
              </span>
              {/* Brand-pink underline draws on after the heading settles */}
              <motion.span
                aria-hidden="true"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.7, ease: EASE, delay: 0.7 }}
                style={{ transformOrigin: 'left center' }}
                className="absolute -bottom-1 left-0 h-1.5 w-24 rounded-sm bg-pink-accent"
              />
            </h1>
          </div>

          {user && (
            <motion.div
              variants={{
                hidden: { opacity: 0, scale: 0.9, y: 8 },
                show: { opacity: 1, scale: 1, y: 0 },
              }}
              transition={{ duration: 0.55, ease: EASE, delay: 0.4 }}
            >
              <CreatePostButton
                open={openComposer}
                onOpenChange={setOpenComposer}
                onCreate={(t, b) => void handleCreatePost(t, b)}
                isPending={createPostMutation.isPending}
              />
            </motion.div>
          )}
        </motion.div>

        {/* Sort tabs */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE, delay: 0.35 }}
        >
          <SortTabs sort={sort} onSortChange={setSort} />
        </motion.div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {!selectedPostId ? (
            <motion.div
              key="list"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: EASE }}
            >
              {listQuery.isLoading ? (
                <motion.div
                  className="space-y-4"
                  initial="hidden"
                  animate="show"
                  variants={{
                    hidden: {},
                    show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
                  }}
                >
                  {Array.from({ length: 4 }).map((_, i) => (
                    <motion.div
                      key={i}
                      variants={{
                        hidden: { opacity: 0, y: 10 },
                        show: { opacity: 1, y: 0 },
                      }}
                      transition={{ duration: 0.4, ease: EASE }}
                    >
                      <PostCardSkeleton />
                    </motion.div>
                  ))}
                </motion.div>
              ) : listQuery.data?.posts.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.6, ease: EASE }}
                >
                  <EmptyState onCreate={() => setOpenComposer(true)} />
                </motion.div>
              ) : (
                <motion.div
                  className="space-y-4"
                  initial="hidden"
                  animate="show"
                  variants={{
                    hidden: {},
                    show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
                  }}
                >
                  <AnimatePresence mode="popLayout">
                    {listQuery.data?.posts.map((post) => (
                      <motion.div
                        key={post.id}
                        layout
                        variants={{
                          hidden: { opacity: 0, y: 16, filter: 'blur(6px)' },
                          show: { opacity: 1, y: 0, filter: 'blur(0px)' },
                        }}
                        transition={{ duration: 0.55, ease: EASE }}
                      >
                        <PostCard
                          post={post}
                          onSelect={() => navigate(`/discussions/${post.id}`, { replace: true })}
                          onVote={(v) => handleVotePost(post.id, v)}
                          isVoting={
                            voteMutation.isPending && voteMutation.variables?.postId === post.id
                          }
                          onEdit={
                            user?.id === post.authorId ? () => handleEditPost(post) : undefined
                          }
                          onDelete={
                            user?.id === post.authorId ? () => void handleDeletePost(post.id) : undefined
                          }
                          canModify={user?.id === post.authorId}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key={`detail-${selectedPostId}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: EASE }}
            >
              {detailQuery.isLoading ? (
                <PostDetailSkeleton />
              ) : detailQuery.data ? (
                <PostDetail
                  post={detailQuery.data.post}
                  comments={detailQuery.data.comments}
                  onBack={handleBack}
                  onVotePost={(v) => handleVotePost(detailQuery.data!.post.id, v)}
                  onVoteComment={(commentId, v) =>
                    handleVoteComment(commentId, v, detailQuery.data!.post.id)
                  }
                  onReply={(parentId, body) =>
                    void handleCreateComment(detailQuery.data!.post.id, parentId, body)
                  }
                  onEditComment={async (commentId: string, body: string) => {
                    await handleUpdateComment(
                      detailQuery.data!.post.id,
                      commentId,
                      body
                    );
                  }}
                  onDeleteComment={(commentId) => {
                    void handleDeleteComment(detailQuery.data!.post.id, commentId);
                  }}
                  onEditPost={async (postId: string, title: string, body: string) => {
                    await handleUpdatePost(postId, title, body);
                  }}
                  isPostVoting={
                    voteMutation.isPending &&
                    voteMutation.variables?.postId === detailQuery.data?.post.id
                  }
                  canInteract={!!user}
                  currentUserId={user?.id}
                  editOnMountId={editOnMountId}
                />
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
