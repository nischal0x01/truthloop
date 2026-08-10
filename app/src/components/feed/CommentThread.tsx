/**
 * CommentThread — recursive nested comment list (Reddit-style).
 *
 * Each node renders: vote column, author line, body, reply affordance, and
 * its children indented one step. Collapsing a node hides its subtree but
 * keeps the header so the user can restore it.
 *
 * Pure presentation + local collapse/reply-target state. The parent owns the
 * mutations and passes `onVote` / `onReply`.
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowUp, ArrowDown, CornerDownRight, Minus, Plus, ShieldAlert } from 'lucide-react';
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
    <ul className="space-y-2.5" role="list">
      {nodes.map((node) => (
        <CommentItem
          key={node.id}
          node={node}
          onVote={onVote}
          onReply={onReply}
          canInteract={canInteract}
        />
      ))}
    </ul>
  );
}

function CommentItem({
  node,
  onVote,
  onReply,
  canInteract,
}: {
  node: CommentNode;
  onVote: CommentThreadProps['onVote'];
  onReply: CommentThreadProps['onReply'];
  canInteract: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [replying, setReplying] = useState(false);

  const score = node.upvotes - node.downvotes;
  const hasKids = node.children.length > 0;

  // Clicking the active arrow again clears the vote (0), matching Reddit.
  const cast = (dir: 1 | -1) => onVote(node.id, node.myVote === dir ? 0 : dir);

  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="relative"
    >
      <div
        className={[
          'rounded-lg border-2 border-black bg-card px-3 py-2.5',
          node.isFlagged ? 'bg-warning/25' : '',
        ].join(' ')}
      >
        <div className="flex gap-2.5">
          {/* ── Vote column ── */}
          <div className="flex flex-col items-center gap-0.5 pt-0.5">
            <button
              type="button"
              disabled={!canInteract || node.isDeleted}
              onClick={() => cast(1)}
              aria-label="Upvote"
              aria-pressed={node.myVote === 1}
              className={[
                'grid size-6 place-items-center rounded border-2 border-black transition-colors',
                'disabled:cursor-not-allowed disabled:opacity-40',
                node.myVote === 1 ? 'bg-accent' : 'bg-background hover:bg-accent/40',
              ].join(' ')}
            >
              <ArrowUp size={13} strokeWidth={2.5} aria-hidden="true" />
            </button>

            <span
              className="text-label-small font-semibold tabular-nums"
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
                'grid size-6 place-items-center rounded border-2 border-black transition-colors',
                'disabled:cursor-not-allowed disabled:opacity-40',
                node.myVote === -1 ? 'bg-danger text-danger-foreground' : 'bg-background hover:bg-danger/25',
              ].join(' ')}
            >
              <ArrowDown size={13} strokeWidth={2.5} aria-hidden="true" />
            </button>
          </div>

          {/* ── Body column ── */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-label-small">
              {!node.isDeleted && (
                <UserAvatar
                  src={node.authorAvatarUrl}
                  name={node.authorName}
                  size={20}
                  className="border border-black"
                />
              )}
              <span className="truncate font-semibold">{node.authorName}</span>
              <span className="text-muted-foreground">·</span>
              <span className="shrink-0 text-muted-foreground">{shortTimeAgo(node.createdAt)}</span>

              {node.isFlagged && (
                <span
                  className="ml-1 inline-flex shrink-0 items-center gap-1 rounded border border-black bg-warning px-1.5 text-[11px] font-medium"
                  title="Flagged by moderation"
                >
                  <ShieldAlert size={10} aria-hidden="true" /> Flagged
                </span>
              )}

              {/* Collapse toggle sits far-right, only when there's a subtree */}
              {hasKids && (
                <button
                  type="button"
                  onClick={() => setCollapsed((c) => !c)}
                  aria-expanded={!collapsed}
                  className="ml-auto inline-flex shrink-0 items-center gap-1 rounded border border-black bg-background px-1.5 py-0.5 text-[11px] hover:bg-muted"
                >
                  {collapsed ? <Plus size={10} /> : <Minus size={10} />}
                  {node.children.length}
                </button>
              )}
            </div>

            <p
              className="mt-1.5 text-label-small leading-relaxed text-foreground/90"
              style={{ overflowWrap: 'anywhere' }}
            >
              {node.body}
            </p>

            {canInteract && !node.isDeleted && (
              <button
                type="button"
                onClick={() => setReplying((r) => !r)}
                className="mt-2 inline-flex items-center gap-1 text-label-small text-muted-foreground hover:text-foreground hover:underline underline-offset-2"
              >
                <CornerDownRight size={12} aria-hidden="true" />
                {replying ? 'Cancel' : 'Reply'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Reply composer ── */}
      {replying && (
        <div className="mt-2 pl-5">
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
      )}

      {/* ── Children: indented, with a guide rail ── */}
      {hasKids && !collapsed && (
        <ul className="mt-2.5 space-y-2.5 border-l-2 border-black/15 pl-3.5" role="list">
          {node.children.map((child) => (
            <CommentItem
              key={child.id}
              node={child}
              onVote={onVote}
              onReply={onReply}
              canInteract={canInteract}
            />
          ))}
        </ul>
      )}
    </motion.li>
  );
}
