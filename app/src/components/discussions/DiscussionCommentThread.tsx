/**
 * DiscussionCommentThread — recursive nested comment list for /discussions/:id.
 *
 * Mirrors the ClaimDetailPanel's CommentThread: depth-coloured rails,
 * magnetic vote arrows, spring score counter, rotating reply icon,
 * collapse/expand via AnimatePresence mode="wait" swapping ± icons.
 *
 * The two threads are intentionally separate components (one talks to the
 * claim-comments API, the other to the discussion-comments API); they share
 * the same motion language but keep their own state machines.
 */

import { useState } from 'react';
import {
  CornerDownRight,
  Minus,
  Pencil,
  Plus,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { UserAvatar } from '@/components/auth/UserAvatar';
import { CommentComposer } from '@/components/feed/CommentComposer';
import {
  shortTimeAgo,
  type DiscussionCommentNode,
  type DiscussionVoteValue,
} from '@/lib/discussions';
import { EASE } from '@/lib/motion';
import { VoteArrow } from './VoteArrow';

/** Depth rail colours — cycles pink → orange → red → green → pink */
const DEPTH_COLORS = [
  'border-pink-accent',
  'border-orange',
  'border-red',
  'border-real',
  'border-pink-accent',
];

interface DiscussionCommentThreadProps {
  nodes: DiscussionCommentNode[];
  onVote: (commentId: string, vote: DiscussionVoteValue) => void;
  onReply: (parentCommentId: string, body: string) => Promise<void>;
  onEdit: (commentId: string, body: string) => Promise<void>;
  onDelete: (commentId: string) => void;
  canInteract: boolean;
  currentUserId?: string;
}

export function DiscussionCommentThread({
  nodes,
  onVote,
  onReply,
  onEdit,
  onDelete,
  canInteract,
  currentUserId,
}: DiscussionCommentThreadProps) {
  return (
    <ul className="space-y-3" role="list">
      <AnimatePresence initial={false}>
        {nodes.map((node, i) => (
          <DiscussionCommentItem
            key={node.id}
            node={node}
            onVote={onVote}
            onReply={onReply}
            onEdit={onEdit}
            onDelete={onDelete}
            canInteract={canInteract}
            depth={0}
            currentUserId={currentUserId}
            index={i}
          />
        ))}
      </AnimatePresence>
    </ul>
  );
}

interface DiscussionCommentItemProps {
  node: DiscussionCommentNode;
  onVote: (commentId: string, vote: DiscussionVoteValue) => void;
  onReply: (parentCommentId: string, body: string) => Promise<void>;
  onEdit: (commentId: string, body: string) => Promise<void>;
  onDelete: (commentId: string) => void;
  canInteract: boolean;
  depth: number;
  currentUserId?: string;
  index?: number;
}

function DiscussionCommentItem({
  node,
  onVote,
  onReply,
  onEdit,
  onDelete,
  canInteract,
  depth,
  currentUserId,
  index = 0,
}: DiscussionCommentItemProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [replying, setReplying] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(node.body);
  const reduce = useReducedMotion();

  const score = node.upvotes - node.downvotes;
  const hasKids = node.children.length > 0;
  const railColor = DEPTH_COLORS[depth % DEPTH_COLORS.length];
  const canModify = currentUserId === node.userId && !node.isDeleted;

  const cast = (dir: 1 | -1) => onVote(node.id, node.myVote === dir ? 0 : dir);

  const handleSaveEdit = async () => {
    if (!editBody.trim()) return;
    await onEdit(node.id, editBody.trim());
    setEditing(false);
  };

  return (
    <motion.li
      layout
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.97 }}
      transition={{ duration: 0.4, ease: EASE, delay: Math.min(index * 0.04, 0.3) }}
      className="relative"
    >
      {depth > 0 && (
        <motion.div
          aria-hidden
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 0.4, ease: EASE, delay: 0.1 }}
          style={{ transformOrigin: 'top center', opacity: 0.6 }}
          className={['absolute left-0 top-0 bottom-0 w-1 rounded-full', railColor].join(' ')}
        />
      )}

      <motion.div
        whileHover={reduce ? undefined : { y: -1 }}
        transition={{ duration: 0.25, ease: EASE }}
        className={[
          'rounded-lg border-2 border-black bg-card transition-shadow',
          node.isFlagged ? 'bg-warning/20' : '',
        ].join(' ')}
      >
        <div className="flex gap-3 p-3">
          {/* Vote column */}
          <div className="flex shrink-0 flex-col items-center gap-1">
            <VoteArrow
              direction={1}
              active={node.myVote === 1}
              activeBg="bg-pink-accent text-black"
              hoverBg="hover:bg-pink-accent/40"
              disabled={!canInteract || node.isDeleted}
              onClick={() => cast(1)}
              ariaLabel="Upvote"
            />

            <motion.span
              key={score}
              initial={reduce ? false : { scale: 0.6, opacity: 0, y: -3 }}
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
              active={node.myVote === -1}
              activeBg="bg-red text-white"
              hoverBg="hover:bg-red/20"
              disabled={!canInteract || node.isDeleted}
              onClick={() => cast(-1)}
              ariaLabel="Downvote"
            />
          </div>

          {/* Body column */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {!node.isDeleted ? (
                <>
                  <UserAvatar
                    src={node.authorAvatarUrl}
                    name={node.authorName}
                    size={24}
                    className="border border-black"
                  />
                  <span className="truncate text-label font-semibold">{node.authorName}</span>
                </>
              ) : (
                <span className="text-label italic text-muted-foreground">[deleted]</span>
              )}
              <span className="text-muted-foreground">·</span>
              <span className="shrink-0 text-label-small text-muted-foreground">
                {shortTimeAgo(node.createdAt)}
              </span>

              {node.isFlagged && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', damping: 14 }}
                  className="relative inline-flex items-center gap-1 overflow-hidden rounded border-2 border-black bg-warning px-2 py-0.5 text-label-small font-bold uppercase tracking-wider"
                  title="Flagged by moderation"
                >
                  <motion.span
                    aria-hidden
                    animate={{ rotate: [0, -6, 6, 0] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <ShieldAlert size={11} aria-hidden="true" />
                  </motion.span>
                  Flagged
                </motion.span>
              )}
            </div>

            {editing ? (
              <motion.div
                initial={reduce ? false : { opacity: 0, y: 6, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                transition={{ duration: 0.3, ease: EASE }}
                className="mt-2 space-y-2 overflow-hidden"
              >
                <textarea
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  className="w-full rounded-lg border-2 border-black bg-card px-3 py-2 text-label shadow-hard-sm outline-none focus:ring-2 focus:ring-black"
                  rows={3}
                />
                <div className="flex gap-2">
                  <motion.button
                    type="button"
                    onClick={handleSaveEdit}
                    whileHover={reduce ? undefined : { scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    transition={{ duration: 0.2, ease: EASE }}
                    className="rounded-lg border-2 border-black bg-accent px-3 py-1 text-label-small font-semibold text-accent-foreground shadow-hard-sm hover:bg-accent/90"
                  >
                    Save
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={() => {
                      setEditing(false);
                      setEditBody(node.body);
                    }}
                    whileHover={reduce ? undefined : { scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    transition={{ duration: 0.2, ease: EASE }}
                    className="rounded-lg border-2 border-black bg-card px-3 py-1 text-label-small font-semibold shadow-hard-sm hover:bg-muted"
                  >
                    Cancel
                  </motion.button>
                </div>
              </motion.div>
            ) : node.isDeleted ? (
              <p className="mt-2 text-label italic text-muted-foreground">
                [This comment has been deleted]
              </p>
            ) : (
              <motion.div
                initial={reduce ? false : { opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: EASE, delay: 0.05 }}
                className="mt-2 text-label leading-relaxed text-foreground/90 discussion-body"
                style={{ overflowWrap: 'anywhere' }}
                dangerouslySetInnerHTML={{ __html: node.body }}
              />
            )}

            {canInteract && !node.isDeleted && (
              <div className="mt-2 flex items-center gap-3">
                <motion.button
                  type="button"
                  onClick={() => setReplying((r) => !r)}
                  whileHover={reduce ? undefined : { y: -1 }}
                  whileTap={{ scale: 0.96 }}
                  transition={{ duration: 0.2, ease: EASE }}
                  className={[
                    'inline-flex items-center gap-1.5 rounded-md border-2 border-black px-2 py-1 text-label-small font-medium transition-all',
                    replying
                      ? 'bg-orange text-black shadow-hard-sm'
                      : 'bg-card hover:-translate-y-0.5 hover:bg-orange/30 hover:shadow-hard-sm',
                  ].join(' ')}
                >
                  <motion.span
                    aria-hidden
                    animate={replying ? { rotate: 90 } : { rotate: 0 }}
                    transition={{ duration: 0.2, ease: EASE }}
                  >
                    <CornerDownRight size={12} aria-hidden="true" />
                  </motion.span>
                  {replying ? 'Cancel' : 'Reply'}
                </motion.button>

                {canModify && !editing && (
                  <>
                    <motion.button
                      type="button"
                      onClick={() => setEditing(true)}
                      whileHover={reduce ? undefined : { scale: 1.06 }}
                      whileTap={{ scale: 0.94 }}
                      transition={{ duration: 0.2, ease: EASE }}
                      className="inline-flex items-center gap-1.5 rounded-md border-2 border-black bg-card px-2 py-1 text-label-small font-medium transition-all hover:bg-muted"
                    >
                      <Pencil size={12} aria-hidden="true" />
                      Edit
                    </motion.button>
                    <motion.button
                      type="button"
                      onClick={() => onDelete(node.id)}
                      whileHover={reduce ? undefined : { scale: 1.06 }}
                      whileTap={{ scale: 0.94 }}
                      transition={{ duration: 0.2, ease: EASE }}
                      className="inline-flex items-center gap-1.5 rounded-md border-2 border-black bg-card px-2 py-1 text-label-small font-medium transition-all hover:bg-danger/20 hover:text-danger"
                    >
                      <Trash2 size={12} aria-hidden="true" />
                      Delete
                    </motion.button>
                  </>
                )}

                {hasKids && (
                  <motion.button
                    type="button"
                    onClick={() => setCollapsed((c) => !c)}
                    whileHover={reduce ? undefined : { scale: 1.03 }}
                    whileTap={{ scale: 0.96 }}
                    transition={{ duration: 0.2, ease: EASE }}
                    aria-expanded={!collapsed}
                    className={[
                      'inline-flex items-center gap-1.5 rounded-md border-2 border-black px-2 py-1 text-label-small font-medium transition-all',
                      collapsed ? 'bg-card hover:bg-muted' : 'bg-orange/20 hover:bg-orange/35',
                    ].join(' ')}
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.span
                        key={collapsed ? 'plus' : 'minus'}
                        aria-hidden
                        initial={{ opacity: 0, rotate: -45, scale: 0.7 }}
                        animate={{ opacity: 1, rotate: 0, scale: 1 }}
                        exit={{ opacity: 0, rotate: 45, scale: 0.7 }}
                        transition={{ duration: 0.18, ease: EASE }}
                        className="inline-flex"
                      >
                        {collapsed ? <Plus size={12} aria-hidden="true" /> : <Minus size={12} aria-hidden="true" />}
                      </motion.span>
                    </AnimatePresence>
                    <span>
                      {collapsed ? 'Show' : 'Hide'} {node.children.length}{' '}
                      {node.children.length === 1 ? 'reply' : 'replies'}
                    </span>
                  </motion.button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Reply composer */}
        <AnimatePresence initial={false}>
          {replying && (
            <motion.div
              initial={reduce ? false : { height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: EASE }}
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
      </motion.div>

      {/* Children */}
      <AnimatePresence initial={false}>
        {hasKids && !collapsed && (
          <motion.div
            initial={reduce ? false : { opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="overflow-hidden"
          >
            <ul
              className={['mt-3 space-y-3 border-l-2 pl-4', railColor].join(' ')}
              style={{ borderLeftWidth: '3px' }}
              role="list"
            >
              <AnimatePresence initial={false}>
                {node.children.map((child, i) => (
                  <DiscussionCommentItem
                    key={child.id}
                    node={child}
                    onVote={onVote}
                    onReply={onReply}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    canInteract={canInteract}
                    depth={depth + 1}
                    currentUserId={currentUserId}
                    index={i}
                  />
                ))}
              </AnimatePresence>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
}
