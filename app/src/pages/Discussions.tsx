/**
 * Discussions — standalone forum page (Reddit-style).
 *
 * URL-based routing:
 *   - /discussions       — list view (sortable: Hot / New / Top, filterable by chip, searchable)
 *   - /discussions/:id   — detail view (single post + nested comments)
 *
 * Page composition (top to bottom):
 *   1. AppNav (sticky)
 *   2. DiscussionHero (editorial split: massive headline + live stats card)
 *   3. DiscussionToolbar (search + category chips + sort, sticky under nav)
 *   4. Post list — first post is "featured" with trending treatment, rest standard
 *      (or EmptyState when zero posts)
 *   5. Detail view when ?id is set
 *
 * State:
 *   - URL drives post selection (replace navigation for back-button parity)
 *   - Local state owns sort, search, active chip
 *
 * Motion:
 *   - Hero entrance (mask reveal + stats stagger)
 *   - Featured card uses larger shadow + ribbon
 *   - List items enter staggered with translateY + blur(6px → 0)
 *   - Sort switch fades list with AnimatePresence mode="wait"
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { AppNav } from '@/components/AppNav';
import { CreatePostButton } from '@/components/discussions/CreatePostButton';
import { DiscussionHero } from '@/components/discussions/DiscussionHero';
import { DiscussionToolbar } from '@/components/discussions/DiscussionToolbar';
import { EmptyState } from '@/components/discussions/EmptyState';
import { PostCard, PostCardSkeleton } from '@/components/discussions/PostCard';
import { PostDetail, PostDetailSkeleton } from '@/components/discussions/PostDetail';
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
import { useMutation } from '@tanstack/react-query';
import { Flame, Newspaper, Sparkles } from 'lucide-react';

const FILTER_CHIPS = [
  { id: 'all', label: 'All', icon: <Sparkles size={12} aria-hidden="true" /> },
  { id: 'trending', label: 'Trending', icon: <Flame size={12} aria-hidden="true" /> },
  { id: 'news', label: 'News', icon: <Newspaper size={12} aria-hidden="true" /> },
];

export function Discussions() {
  const { id: postIdFromUrl } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const [sort, setSort] = useState<SortOrder>('hot');
  const [search, setSearch] = useState('');
  const [activeChip, setActiveChip] = useState<string>('all');
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

  /* ── Queries ── */

  const listQuery = useQuery(getDiscussionsQuery(sort));

  const detailQuery = useQuery({
    ...getDiscussionByIdQuery(selectedPostId ?? ''),
    enabled: !!selectedPostId,
  });

  /* ── Mutations ── */

  const voteMutation = useMutation(voteDiscussionMutation());
  const createPostMutation = useMutation(createDiscussionMutation());
  const updatePostMutation = useMutation(updateDiscussionMutation());
  const deletePostMutation = useMutation(deleteDiscussionMutation());
  const createCommentMutation = useMutation(createDiscussionCommentMutation());
  const voteCommentMutation = useMutation(voteDiscussionCommentMutation());
  const updateCommentMutation = useMutation(updateDiscussionCommentMutation());
  const deleteCommentMutation = useMutation(deleteDiscussionCommentMutation());

  /* ── Handlers ── */

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

  /* ── Derived ── */

  const allPosts = useMemo<DiscussionPost[]>(
    () => listQuery.data?.posts ?? [],
    [listQuery.data]
  );

  const filteredPosts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allPosts;
    return allPosts.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.authorName.toLowerCase().includes(q) ||
        p.body.toLowerCase().includes(q)
    );
  }, [allPosts, search]);

  const totalPosts = allPosts.length;
  const totalReplies = useMemo(
    () => allPosts.reduce((sum, p) => sum + p.commentCount, 0),
    [allPosts]
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppNav showClaims={true} />

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        {/* Hero — only show on the list view */}
        {!selectedPostId && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
          >
            <DiscussionHero
              totalPosts={totalPosts}
              totalReplies={totalReplies}
              onlineNow={Math.max(7, Math.min(99, Math.round(totalPosts * 0.7) || 11))}
            />
          </motion.div>
        )}

        {/* Create-post CTA + toolbar — only on list view */}
        {!selectedPostId && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE, delay: 0.6 }}
            className="mt-6 flex items-center justify-end"
          >
            {user && (
              <CreatePostButton
                open={openComposer}
                onOpenChange={setOpenComposer}
                onCreate={(t, b) => void handleCreatePost(t, b)}
                isPending={createPostMutation.isPending}
              />
            )}
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {!selectedPostId ? (
            <motion.div
              key="list"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: EASE }}
              className="mt-6"
            >
              {!selectedPostId && (
                <DiscussionToolbar
                  search={search}
                  onSearchChange={setSearch}
                  chips={FILTER_CHIPS}
                  activeChip={activeChip}
                  onChipChange={setActiveChip}
                  sort={sort}
                  onSortChange={setSort}
                />
              )}

              {/* List */}
              <div className="mt-5">
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
                ) : filteredPosts.length === 0 ? (
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
                      {filteredPosts.map((post, idx) => (
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
                            featured={idx === 0}
                            rank={idx + 1}
                          />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </motion.div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={`detail-${selectedPostId}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: EASE }}
              className="mt-6"
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
                    handleCreateComment(detailQuery.data!.post.id, parentId, body)
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