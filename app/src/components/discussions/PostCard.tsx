/**
 * PostCard — a single discussion post in the list view.
 *
 * Structure:
 *   ┌────────────────────────────────────────────────┐
 *   │ ▲  │ Title                          [✎] [🗑]   │  ← vote rail + title row
 *   │ N  │ "Excerpt line-clamped to 2 rows…"        │
 *   │ ▼  │ (optional image)                          │
 *   │    │ @author · 5m ago           💬 12          │
 *   └────────────────────────────────────────────────┘
 *
 * Click anywhere on the card → opens detail (stopPropagation on vote/edit/delete).
 * Edit/delete buttons only show for the author.
 *
 * Motion:
 *   - layout prop on the article for sibling reflow during sort changes
 *   - hover lift (`y: -2`) + shadow expansion
 *   - spring score counter (`key={score}`)
 *   - edit/delete mini-buttons rotate on hover
 */

import { MessageCircle, Pencil, Trash2 } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { UserAvatar } from '@/components/auth/UserAvatar';
import { shortTimeAgo, type DiscussionPost } from '@/lib/discussions';
import { EASE } from '@/lib/motion';
import { VoteArrow } from './VoteArrow';

interface PostCardProps {
  post: DiscussionPost;
  onSelect: () => void;
  onVote: (vote: 1 | -1 | 0) => void;
  isVoting?: boolean;
  onEdit?: (postId: string) => void;
  onDelete?: (postId: string) => void;
  canModify?: boolean;
}

export function PostCard({
  post,
  onSelect,
  onVote,
  isVoting,
  onEdit,
  onDelete,
  canModify,
}: PostCardProps) {
  const score = post.upvotes - post.downvotes;
  const reduce = useReducedMotion();

  const cast = (dir: 1 | -1) => {
    if (isVoting) return;
    onVote(post.myVote === dir ? 0 : dir);
  };

  return (
    <motion.article
      layout
      whileHover={reduce ? undefined : { y: -2 }}
      transition={{ duration: 0.3, ease: EASE }}
      className="group cursor-pointer overflow-hidden rounded-lg border-2 border-black bg-card shadow-hard-sm transition-shadow duration-300 hover:shadow-hard"
      onClick={onSelect}
      aria-label={`Post: ${post.title}`}
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
            disabled={isVoting}
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
              score > 0 ? 'text-real' : score < 0 ? 'text-danger' : 'text-muted-foreground',
            ].join(' ')}
          >
            {score}
          </motion.span>

          <VoteArrow
            direction={-1}
            active={post.myVote === -1}
            activeBg="bg-red text-white"
            hoverBg="hover:bg-red/20"
            disabled={isVoting}
            onClick={() => cast(-1)}
            ariaLabel="Downvote"
          />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1 p-4">
          <div className="flex items-start justify-between gap-2">
            <h2 className="flex-1 font-display text-heading-3 font-semibold leading-tight text-foreground transition-colors duration-300 group-hover:text-pink-accent">
              {post.title}
            </h2>
            {canModify && (
              <div className="flex shrink-0 gap-1" onClick={(e) => e.stopPropagation()}>
                {onEdit && (
                  <motion.button
                    type="button"
                    onClick={() => onEdit(post.id)}
                    whileHover={reduce ? undefined : { scale: 1.08, rotate: -4 }}
                    whileTap={{ scale: 0.92 }}
                    transition={{ duration: 0.2, ease: EASE }}
                    className="rounded-md border-2 border-black bg-card p-1.5 transition-all hover:bg-muted"
                    aria-label="Edit post"
                  >
                    <Pencil size={12} aria-hidden="true" />
                  </motion.button>
                )}
                {onDelete && (
                  <motion.button
                    type="button"
                    onClick={() => onDelete(post.id)}
                    whileHover={reduce ? undefined : { scale: 1.08, rotate: 4 }}
                    whileTap={{ scale: 0.92 }}
                    transition={{ duration: 0.2, ease: EASE }}
                    className="rounded-md border-2 border-black bg-card p-1.5 transition-all hover:bg-danger/20 hover:text-danger"
                    aria-label="Delete post"
                  >
                    <Trash2 size={12} aria-hidden="true" />
                  </motion.button>
                )}
              </div>
            )}
          </div>
          <div
            className="mt-1.5 line-clamp-2 text-label text-foreground/80 discussion-body"
            dangerouslySetInnerHTML={{ __html: post.body }}
          />

          {post.imageUrl && (
            <img
              src={post.imageUrl}
              alt="Attachment"
              className="mt-3 max-h-48 rounded-lg border-2 border-black object-cover"
            />
          )}

          <div className="mt-3 flex items-center justify-between gap-3">
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

            <div className="flex items-center gap-1.5 text-label-small font-semibold text-foreground">
              <MessageCircle size={13} aria-hidden="true" />
              <span className="tabular-nums">{post.commentCount}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

/* ── Skeleton (lives with its component, matching ClaimCardSkeleton pattern) ── */

export function PostCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border-2 border-black bg-card shadow-hard-sm">
      <div className="flex gap-3 p-4">
        <div className="w-14 shrink-0 border-r-2 border-black pr-3">
          <div className="mx-auto size-8 animate-pulse rounded-md bg-muted" />
          <div className="mx-auto mt-1.5 h-4 w-6 animate-pulse rounded bg-muted" />
          <div className="mx-auto mt-1.5 size-8 animate-pulse rounded-md bg-muted" />
        </div>
        <div className="flex-1 space-y-2">
          <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
          <div className="mt-3 flex gap-2">
            <div className="size-5 animate-pulse rounded-full bg-muted" />
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </div>
    </div>
  );
}
