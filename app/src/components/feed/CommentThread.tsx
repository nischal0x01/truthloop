/**
 * CommentThread — enhanced recursive nested comment list (Reddit-style).
 *
 * Visual improvements:
 * - Better depth indicators with colored left rails
 * - Smooth collapse/expand animations
 * - Improved author attribution with better spacing
 * - Enhanced vote buttons with better hover states
 * - Reply threading with visual connection lines
 * - Flagged comments have distinct visual treatment
 *
 * Pure presentation + local collapse/reply-target state. The parent owns the
 * mutations and passes `onVote` / `onReply`.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowUp,
  ArrowDown,
  CornerDownRight,
  Minus,
  Plus,
  ShieldAlert,
} from 'lucide-react';
import { UserAvatar } from '@/components/auth/UserAvatar';
import { CommentComposer } from './CommentComposer';
import { shortTimeAgo, type CommentNode, type CommentVoteValue } from '@/lib/comments';

interface CommentThreadProps {
  nodes: CommentNode[];
  onVote: (commentId: string, vote: CommentVoteValue) => void;
  onReply: (parentCommentId: string, body: string) => Promise<void>;
  canInteract: boolean;
}

export function CommentThread({ nodes, onVote, onReply, canInteract }: CommentThreadProps) {
  return (
    <ul className="space-y-3" role="list">
      {nodes.map((node) => (
        <CommentItem
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

interface CommentItemProps {
  node: CommentNode;
  onVote: (commentId: string, vote: CommentVoteValue) => void;
  onReply: (parentCommentId: string, body: string) => Promise<void>;
  canInteract: boolean;
  depth: number;
}

/** Depth colors for left rail — cycles through semantic colors */
const DEPTH_COLORS = [
  'border-black',
  'border-accent',
  'border-danger',
  'border-warning',
  'border-highlight',
];

function CommentItem({
  node,
  onVote,
  onReply,
  canInteract,
  depth,
}: CommentItemProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [replying, setReplying] = useState(false);

  const score = node.upvotes - node.downvotes;
  const hasKids = node.children.length > 0;
  const railColor = DEPTH_COLORS[depth % DEPTH_COLORS.length];

  // Clicking the active arrow again clears the vote (0), matching Reddit.
  const cast = (dir: 1 | -1) => onVote(node.id, node.myVote === dir ? 0 : dir);

  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="relative"
    >
      {/* Depth rail indicator */}
      {depth > 0 && (
        <div
          className={[
            'absolute left-0 top-0 bottom-0 w-1 rounded-full',
            railColor,
          ].join(' ')}
          style={{ opacity: 0.6 }}
          aria-hidden="true"
        />
      )}

      <div
        className={[
          'rounded-lg border-2 border-black bg-card transition-colors',
          node.isFlagged ? 'bg-warning/20' : '',
          hasKids ? '' : '',
        ].join(' ')}
      >
        <div className="flex gap-3 p-3">
          {/* ── Vote column ── */}
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
                node.myVote === 1
                  ? 'bg-accent text-accent-foreground shadow-hard-sm'
                  : 'bg-card hover:bg-accent/30',
              ].join(' ')}
            >
              <ArrowUp size={14} strokeWidth={2.5} aria-hidden="true" />
            </button>

            <span
              className={[
                'text-label-small font-bold tabular-nums',
                score > 0 ? 'text-foreground' : score < 0 ? 'text-danger' : 'text-muted-foreground',
              ].join(' ')}
              aria-label={`Score ${score}`}
            >
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
                node.myVote === -1
                  ? 'bg-danger text-danger-foreground shadow-hard-sm'
                  : 'bg-card hover:bg-danger/25',
              ].join(' ')}
            >
              <ArrowDown size={14} strokeWidth={2.5} aria-hidden="true" />
            </button>
          </div>

          {/* ── Body column ── */}
          <div className="min-w-0 flex-1">
            {/* Author line */}
            <div className="flex items-center gap-2 flex-wrap">
              {!node.isDeleted ? (
                <>
                  <UserAvatar
                    src={node.authorAvatarUrl}
                    name={node.authorName}
                    size={24}
                    className="border border-black"
                  />
                  <span className="text-label font-semibold truncate">{node.authorName}</span>
                </>
              ) : (
                <span className="text-label text-muted-foreground italic">[deleted]</span>
              )}
              <span className="text-muted-foreground">·</span>
              <span className="text-label-small text-muted-foreground shrink-0">
                {shortTimeAgo(node.createdAt)}
              </span>

              {node.isFlagged && (
                <span
                  className="inline-flex items-center gap-1 rounded border-2 border-black bg-warning px-2 py-0.5 text-label-small font-bold uppercase tracking-wider"
                  title="Flagged by moderation"
                >
                  <ShieldAlert size={11} aria-hidden="true" />
                  Flagged
                </span>
              )}
            </div>

            {/* Comment body */}
            <p
              className={[
                'mt-2 text-label leading-relaxed',
                node.isDeleted ? 'text-muted-foreground italic' : 'text-foreground/90',
              ].join(' ')}
              style={{ overflowWrap: 'anywhere' }}
            >
              {node.isDeleted ? '[This comment has been deleted]' : node.body}
            </p>

            {/* Action buttons */}
            {canInteract && !node.isDeleted && (
              <div className="mt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setReplying((r) => !r)}
                  className={[
                    'inline-flex items-center gap-1.5 rounded-md border-2 border-black px-2 py-1 text-label-small font-medium transition-all',
                    replying
                      ? 'bg-accent text-accent-foreground shadow-hard-sm'
                      : 'bg-card hover:bg-accent/30 hover:-translate-y-0.5 hover:shadow-hard-sm',
                  ].join(' ')}
                >
                  <CornerDownRight size={12} aria-hidden="true" />
                  {replying ? 'Cancel' : 'Reply'}
                </button>

                {/* Collapse toggle */}
                {hasKids && (
                  <button
                    type="button"
                    onClick={() => setCollapsed((c) => !c)}
                    aria-expanded={!collapsed}
                    className={[
                      'inline-flex items-center gap-1.5 rounded-md border-2 border-black px-2 py-1 text-label-small font-medium transition-all',
                      collapsed
                        ? 'bg-card hover:bg-muted'
                        : 'bg-muted hover:bg-muted/80',
                    ].join(' ')}
                  >
                    {collapsed ? (
                      <Plus size={12} aria-hidden="true" />
                    ) : (
                      <Minus size={12} aria-hidden="true" />
                    )}
                    <span>{collapsed ? 'Show' : 'Hide'} {node.children.length} {node.children.length === 1 ? 'reply' : 'replies'}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Reply composer ── */}
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

      {/* ── Children: indented with visual connection ── */}
      <AnimatePresence>
        {hasKids && !collapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <ul
              className={[
                'mt-3 space-y-3 border-l-2 pl-4',
                railColor,
              ].join(' ')}
              style={{ borderLeftWidth: '3px' }}
              role="list"
            >
              {node.children.map((child) => (
                <CommentItem
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
