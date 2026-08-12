/**
 * PostDetail — full discussion view at /discussions/:id.
 *
 * Sections:
 *   1. Back button (chevron slides left on hover)
 *   2. Post article (vote rail + title + author + body, or edit form)
 *   3. Comment count header (with comment-thread component below)
 *   4. Reply composer (sticky-ish at the bottom)
 *
 * Motion:
 *   - Container fades up on mount
 *   - Article body parts cascade in (title → meta → body)
 *   - Edit mode swaps with a brief fade
 *   - Save / Cancel buttons have whileHover scale + whileTap press
 *   - Vote rail uses shared VoteArrow + spring score counter
 */

import { useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  MessageCircle,
  Pencil,
} from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { UserAvatar } from '@/components/auth/UserAvatar';
import { CommentComposer } from '@/components/feed/CommentComposer';
import { RichTextEditor } from '@/components/feed/RichTextEditor';
import {
  buildDiscussionTree,
  countDiscussionComments,
  shortTimeAgo,
  type DiscussionComment,
  type DiscussionPost,
  type DiscussionVoteValue,
} from '@/lib/discussions';
import { EASE } from '@/lib/motion';
import { DiscussionCommentThread } from './DiscussionCommentThread';
import { VoteArrow } from './VoteArrow';

interface PostDetailProps {
  post: DiscussionPost;
  comments: DiscussionComment[];
  onBack: () => void;
  onVotePost: (vote: 1 | -1 | 0) => void;
  onVoteComment: (commentId: string, vote: DiscussionVoteValue) => void;
  onReply: (parentCommentId: string | null, body: string) => Promise<void>;
  onEditComment: (commentId: string, body: string) => Promise<void>;
  onDeleteComment: (commentId: string) => void;
  onEditPost: (postId: string, title: string, body: string) => Promise<void>;
  isPostVoting?: boolean;
  canInteract: boolean;
  currentUserId?: string;
  editOnMountId?: string | null;
}

export function PostDetail({
  post,
  comments,
  onBack,
  onVotePost,
  onVoteComment,
  onReply,
  onEditComment,
  onDeleteComment,
  onEditPost,
  isPostVoting,
  canInteract,
  currentUserId,
  editOnMountId,
}: PostDetailProps) {
  const [editing, setEditing] = useState(editOnMountId === post.id);
  const [editTitle, setEditTitle] = useState(post.title);
  const [editBody, setEditBody] = useState(post.body);
  const editSectionRef = useRef<HTMLDivElement>(null);
  const score = post.upvotes - post.downvotes;
  const tree = buildDiscussionTree(comments);
  const canModify = currentUserId === post.authorId;
  const reduce = useReducedMotion();
  const totalComments = countDiscussionComments(tree);

  useEffect(() => {
    if (editing) {
      setTimeout(() => {
        editSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [editing]);

  const cast = (dir: 1 | -1) => onVotePost(post.myVote === dir ? 0 : dir);

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) return;
    // Tiptap renders empty content as <p></p> — strip those before checking
    const strippedBody = editBody.replace(/<p>\s*<\/p>/g, '').trim();
    if (!strippedBody) return;
    await onEditPost(post.id, editTitle.trim(), editBody);
    setEditing(false);
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setEditTitle(post.title);
    setEditBody(post.body);
  };

  const scrollToEdit = () => {
    setEditing(true);
    setTimeout(() => {
      editSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
    >
      {/* Back button */}
      <motion.button
        type="button"
        onClick={onBack}
        whileHover={reduce ? undefined : { x: -2 }}
        whileTap={{ scale: 0.97 }}
        transition={{ duration: 0.2, ease: EASE }}
        className="mb-4 inline-flex items-center gap-1.5 rounded-lg border-2 border-black bg-pink-accent px-3 py-1.5 text-label-small font-semibold shadow-hard-sm transition-[box-shadow,translate] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:shadow-hard"
      >
        <motion.span
          aria-hidden
          whileHover={reduce ? undefined : { x: -2 }}
          transition={{ duration: 0.2, ease: EASE }}
        >
          <ChevronLeft size={14} aria-hidden="true" />
        </motion.span>
        Back
      </motion.button>

      {/* Post */}
      <motion.article
        layout
        className="overflow-hidden rounded-lg border-2 border-black bg-card shadow-hard"
      >
        <div className="flex gap-0">
          {/* Vote column */}
          <div
            className="flex w-14 flex-col items-center gap-1 border-r-2 border-black bg-orange/10 py-4"
            onClick={(e) => e.stopPropagation()}
          >
            <VoteArrow
              direction={1}
              active={post.myVote === 1}
              activeBg="bg-pink-accent text-black"
              hoverBg="hover:bg-pink-accent/40"
              disabled={isPostVoting}
              onClick={() => cast(1)}
              ariaLabel="Upvote"
            />

            <motion.span
              key={score}
              initial={reduce ? false : { scale: 0.6, opacity: 0, y: -4 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: 'spring', damping: 14, stiffness: 280 }}
              className={[
                'text-label-small font-bold tabular-nums',
                score > 0 ? 'text-real' : score < 0 ? 'text-red' : 'text-muted-foreground',
              ].join(' ')}
            >
              {score}
            </motion.span>

            <VoteArrow
              direction={-1}
              active={post.myVote === -1}
              activeBg="bg-red text-white"
              hoverBg="hover:bg-red/20"
              disabled={isPostVoting}
              onClick={() => cast(-1)}
              ariaLabel="Downvote"
            />
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1 p-5">
            {editing ? (
              <motion.div
                ref={editSectionRef}
                initial={reduce ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: EASE }}
                className="space-y-3"
              >
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  maxLength={300}
                  className="w-full rounded-lg border-2 border-black bg-card px-3 py-2 text-label font-semibold shadow-hard-sm outline-none focus:ring-2 focus:ring-black"
                />
                <RichTextEditor
                  content={editBody}
                  onChange={setEditBody}
                  placeholder="Write your post…"
                  maxLength={2000}
                />
                <div className="flex gap-2">
                  <motion.button
                    type="button"
                    onClick={handleSaveEdit}
                    whileHover={reduce ? undefined : { scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    transition={{ duration: 0.2, ease: EASE }}
                    className="rounded-lg border-2 border-black bg-accent px-4 py-1.5 text-label-small font-semibold text-accent-foreground shadow-hard-sm hover:bg-accent/90"
                  >
                    Save
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={handleCancelEdit}
                    whileHover={reduce ? undefined : { scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    transition={{ duration: 0.2, ease: EASE }}
                    className="rounded-lg border-2 border-black bg-card px-4 py-1.5 text-label-small font-semibold shadow-hard-sm hover:bg-muted"
                  >
                    Cancel
                  </motion.button>
                </div>
              </motion.div>
            ) : (
              <>
                <motion.div
                  className="flex items-start justify-between gap-3"
                  initial={reduce ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: EASE }}
                >
                  <h1 className="flex-1 font-display text-heading-2 font-semibold leading-tight text-foreground">
                    {post.title}
                  </h1>
                  {canModify && (
                    <motion.button
                      type="button"
                      onClick={scrollToEdit}
                      whileHover={reduce ? undefined : { scale: 1.08, rotate: -4 }}
                      whileTap={{ scale: 0.92 }}
                      transition={{ duration: 0.2, ease: EASE }}
                      className="shrink-0 rounded-lg border-2 border-black bg-card p-1.5 text-label-small font-semibold shadow-hard-sm hover:bg-muted"
                      aria-label="Edit post"
                    >
                      <Pencil size={14} aria-hidden="true" />
                    </motion.button>
                  )}
                </motion.div>

                <motion.div
                  className="mt-2 flex items-center gap-2"
                  initial={reduce ? false : { opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: EASE, delay: 0.1 }}
                >
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
                </motion.div>

                <motion.div
                  className="mt-4 text-label leading-relaxed text-foreground/90 discussion-body"
                  initial={reduce ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: EASE, delay: 0.2 }}
                  dangerouslySetInnerHTML={{ __html: post.body }}
                />
              </>
            )}
          </div>
        </div>
      </motion.article>

      {/* Comment thread */}
      {tree.length > 0 && (
        <motion.section
          className="mt-6"
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE, delay: 0.3 }}
        >
          <div className="mb-3 flex items-center gap-2">
            <MessageCircle size={14} aria-hidden="true" />
            <p className="text-label-small font-bold uppercase tracking-wider text-dark-panel">
              {totalComments} {totalComments === 1 ? 'comment' : 'comments'}
            </p>
            <span className="h-px flex-1 bg-black/10" />
          </div>
          <DiscussionCommentThread
            nodes={tree}
            onVote={(commentId, vote) => onVoteComment(commentId, vote)}
            onReply={async (parentId, body) => {
              await onReply(parentId, body);
            }}
            onEdit={onEditComment}
            onDelete={onDeleteComment}
            canInteract={canInteract}
            currentUserId={currentUserId}
          />
        </motion.section>
      )}

      {/* Comment composer — at bottom, Reddit-style */}
      <motion.div
        className="mt-5"
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: EASE, delay: 0.4 }}
      >
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
      </motion.div>
    </motion.div>
  );
}

/* ── Skeleton (lives with its component, matching ClaimCardSkeleton pattern) ── */

export function PostDetailSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-10 w-24 animate-pulse rounded-lg bg-muted" />
      <div className="overflow-hidden rounded-lg border-2 border-black bg-card p-5 shadow-hard">
        <div className="flex gap-3">
          <div className="w-14 shrink-0 border-r-2 border-black pr-3">
            <div className="mx-auto size-8 animate-pulse rounded-md bg-muted" />
            <div className="mx-auto mt-1.5 h-4 w-6 animate-pulse rounded bg-muted" />
            <div className="mx-auto mt-1.5 size-8 animate-pulse rounded-md bg-muted" />
          </div>
          <div className="flex-1 space-y-3">
            <div className="h-7 w-full animate-pulse rounded bg-muted" />
            <div className="flex gap-2">
              <div className="size-6 animate-pulse rounded-full bg-muted" />
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
            </div>
            <div className="h-20 w-full animate-pulse rounded bg-muted" />
          </div>
        </div>
      </div>
    </div>
  );
}
