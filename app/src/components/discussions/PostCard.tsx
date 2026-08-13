/**
 * PostCard — premium single-post card for the discussions list.
 *
 * Two visual variants:
 *   - default: compact horizontal card with a vote cluster on the left
 *   - featured: the first post in the list (or top-voted) renders larger with
 *     a "TRENDING" ribbon, image-friendly area, and bolder typography
 *
 * Structure:
 *   ┌─[ vote cluster ]─[ content: ribbon · title · excerpt · meta strip ]─┐
 *
 * Motion:
 *   - hover lift (y: -2) + shadow expansion
 *   - spring score counter (key={score})
 *   - staggered children entrance (parent passes variants)
 *   - title slides right and color shifts on hover (magnetic)
 */

import { MessageCircle, Pencil, Sparkles, Trash2 } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { UserAvatar } from '@/components/auth/UserAvatar';
import { shortTimeAgo, type DiscussionPost } from '@/actions/discussions';
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
  /** Renders the featured treatment (ribbon + larger card). */
  featured?: boolean;
  /** Position in the list (1-based) — used for the rank pill on featured cards. */
  rank?: number;
}

export function PostCard({
  post,
  onSelect,
  onVote,
  isVoting,
  onEdit,
  onDelete,
  canModify,
  featured = false,
  rank,
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
      whileHover={reduce ? undefined : { y: -3 }}
      transition={{ duration: 0.35, ease: EASE }}
      className={[
        'group relative cursor-pointer overflow-hidden rounded-[1.25rem] border-2 border-black bg-card',
        'transition-shadow duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
        featured ? 'shadow-hard hover:shadow-hard-lg' : 'shadow-hard-sm hover:shadow-hard',
      ].join(' ')}
      onClick={onSelect}
      aria-label={`Post: ${post.title}`}
    >
      {/* Featured: ambient orb + rank ribbon */}
      {featured && (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-pink-accent/15 blur-3xl"
          />
          <div className="absolute left-0 top-0 z-10 flex items-center gap-1.5 rounded-br-2xl border-b-2 border-r-2 border-black bg-pink-accent px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-black">
            <Sparkles size={11} aria-hidden="true" />
            <span>Trending</span>
            {typeof rank === 'number' && (
              <span className="rounded-full border border-black/30 bg-black/10 px-1.5 text-[10px] tabular-nums">
                #{rank}
              </span>
            )}
          </div>
        </>
      )}

      <div className="flex gap-0">
        {/* Vote cluster — column with score front and center */}
        <div
          className={[
            'flex shrink-0 flex-col items-center gap-1 border-r-2 border-black bg-orange/10',
            featured ? 'w-20 py-5' : 'w-16 py-4',
          ].join(' ')}
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
              'font-bold tabular-nums',
              featured ? 'text-heading-3' : 'text-label-small',
              score > 0 ? 'text-real' : score < 0 ? 'text-danger' : 'text-muted-foreground',
            ].join(' ')}
          >
            {score > 0 ? `+${score}` : score}
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
        <div className={['min-w-0 flex-1', featured ? 'p-6' : 'p-4'].join(' ')}>
          <div className="flex items-start justify-between gap-2">
            <h2
              className={[
                'flex-1 font-display font-semibold leading-tight text-foreground',
                'transition-[transform,color] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
                'group-hover:translate-x-0.5 group-hover:text-pink-accent',
                featured ? 'text-heading-1 leading-heading-1' : 'text-heading-3 leading-heading-3',
              ].join(' ')}
            >
              {post.title}
            </h2>
            {canModify && (
              <div
                className="flex shrink-0 gap-1"
                onClick={(e) => e.stopPropagation()}
              >
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
            className={[
              'mt-2 line-clamp-2 text-foreground/80 discussion-body',
              featured ? 'text-body leading-body-large' : 'text-label leading-label',
            ].join(' ')}
            dangerouslySetInnerHTML={{ __html: post.body }}
          />

          {post.imageUrl && (
            <img
              src={post.imageUrl}
              alt="Attachment"
              className={[
                'mt-4 max-h-72 w-full rounded-xl border-2 border-black object-cover',
              ].join(' ')}
            />
          )}

          {/* Meta strip — composed of pills with hairline dividers */}
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
            <div className="inline-flex items-center gap-1.5">
              <UserAvatar
                src={post.authorAvatarUrl}
                name={post.authorName}
                size={20}
                className="border border-black"
              />
              <span className="text-label-small font-semibold">
                {post.authorName}
              </span>
            </div>

            <span aria-hidden className="text-foreground/30">·</span>

            <span className="text-label-small text-foreground/60">
              {shortTimeAgo(post.createdAt)}
            </span>

            <span aria-hidden className="text-foreground/30">·</span>

            <span className="inline-flex items-center gap-1 rounded-full border border-black/20 bg-card px-2 py-0.5 text-label-small font-semibold">
              <MessageCircle size={12} aria-hidden="true" />
              <span className="tabular-nums">{post.commentCount}</span>
              <span className="text-foreground/60">replies</span>
            </span>

            {post.myVote !== 0 && (
              <span
                className={[
                  'inline-flex items-center gap-1 rounded-full border-2 border-black px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                  post.myVote === 1 ? 'bg-pink-accent text-black' : 'bg-red text-white',
                ].join(' ')}
              >
                {post.myVote === 1 ? 'You upvoted' : 'You downvoted'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Hover sheen — appears on group hover */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-1 origin-top scale-y-0 bg-pink-accent transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-y-100"
      />
    </motion.article>
  );
}

/* ── Skeleton (lives with its component, matching ClaimCardSkeleton pattern) ── */

export function PostCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[1.25rem] border-2 border-black bg-card shadow-hard-sm">
      <div className="flex gap-0">
        <div className="flex w-16 shrink-0 flex-col items-center gap-1.5 border-r-2 border-black py-4">
          <div className="size-8 animate-pulse rounded-md bg-muted" />
          <div className="h-4 w-6 animate-pulse rounded bg-muted" />
          <div className="size-8 animate-pulse rounded-md bg-muted" />
        </div>
        <div className="flex-1 space-y-2.5 p-4">
          <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
          <div className="mt-3 flex gap-2">
            <div className="size-5 animate-pulse rounded-full bg-muted" />
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="h-4 w-12 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </div>
    </div>
  );
}