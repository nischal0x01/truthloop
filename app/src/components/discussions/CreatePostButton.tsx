/**
 * CreatePostButton — trigger + modal for creating a new discussion post.
 *
 * Controlled OR uncontrolled open state (parent can drive it via props, or it
 * manages its own).
 *
 * Visual:
 *   - Trigger is button-in-button: pink CTA with nested circular Plus icon
 *     that rotates 90° on hover.
 *   - Modal: spring entrance with -1.5° rotate, ambient pink orb, backdrop
 *     blur, rotate-close button (X spins 90° on hover).
 *   - Submit is button-in-button: nested arrow circle.
 */

import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Plus, X } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { RichTextEditor } from '@/components/feed/RichTextEditor';
import { EASE } from '@/lib/motion';

interface CreatePostButtonProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onCreate: (title: string, body: string) => void;
  isPending: boolean;
}

export function CreatePostButton({
  open: controlledOpen,
  onOpenChange,
  onCreate,
  isPending,
}: CreatePostButtonProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    setTimeout(() => dialogRef.current?.querySelector<HTMLInputElement>('#post-title')?.focus(), 50);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, setOpen]);

  const handleSubmit = async () => {
    if (!title.trim() || !body.trim()) return;
    await onCreate(title.trim(), body.trim());
    setTitle('');
    setBody('');
    setOpen(false);
  };

  return (
    <>
      {/* Trigger — button-in-button */}
      <motion.button
        type="button"
        onClick={() => setOpen(true)}
        whileHover={reduce ? undefined : { scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        transition={{ duration: 0.25, ease: EASE }}
        className="group inline-flex items-center gap-2 rounded-lg border-2 border-black bg-accent px-3 py-2 text-label font-semibold text-accent-foreground shadow-hard transition-[box-shadow,translate] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-x-0 active:translate-y-0 active:shadow-hard"
      >
        <span className="grid size-7 place-items-center rounded-full border-2 border-black bg-black/10 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-110 group-hover:rotate-90">
          <Plus size={14} strokeWidth={2.5} aria-hidden="true" />
        </span>
        <span>New Post</span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="fixed inset-0 z-40 bg-black/45 backdrop-blur-md"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />

            {/* Modal */}
            <motion.div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-label="Create new post"
              className="fixed inset-0 z-50 flex items-center justify-center p-6"
              onClick={() => setOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <motion.div
                onClick={(e) => e.stopPropagation()}
                initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9, y: 24, rotate: -1.5 }}
                animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 12, rotate: 1.5 }}
                transition={{ type: 'spring', damping: 18, stiffness: 240 }}
                className="relative w-full max-w-lg overflow-hidden rounded-2xl border-2 border-black bg-card shadow-hard-lg max-h-[90vh]"
              >
                {/* Ambient orb */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-pink-accent/10 blur-3xl"
                />

                {/* Header */}
                <div className="relative flex items-center justify-between border-b-2 border-black px-5 py-4">
                  <h2 className="font-display text-heading-3 font-semibold">New Discussion</h2>
                  <motion.button
                    type="button"
                    onClick={() => setOpen(false)}
                    whileHover={reduce ? undefined : { scale: 1.08, rotate: 90 }}
                    whileTap={{ scale: 0.92 }}
                    transition={{ duration: 0.25, ease: EASE }}
                    className="grid size-8 place-items-center rounded-lg border-2 border-black bg-card shadow-hard-sm transition-all hover:bg-muted"
                    aria-label="Close"
                  >
                    <X size={15} aria-hidden="true" />
                  </motion.button>
                </div>

                {/* Form */}
                <div className="relative max-h-[calc(90vh-140px)] space-y-4 overflow-y-auto p-5">
                  <div>
                    <label htmlFor="post-title" className="mb-1.5 block text-label-small font-semibold">
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
                    <label className="mb-1.5 block text-label-small font-semibold">
                      Body
                    </label>
                    <RichTextEditor
                      content={body}
                      onChange={setBody}
                      placeholder="Share your thoughts, questions, or insights…"
                      maxLength={2000}
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="relative flex justify-end gap-3 border-t-2 border-black px-5 py-4">
                  <Button
                    variant="outline"
                    onClick={() => setOpen(false)}
                    className="rounded-lg border-2 border-black shadow-hard-sm"
                  >
                    Cancel
                  </Button>
                  <motion.button
                    type="button"
                    onClick={() => void handleSubmit()}
                    disabled={!title.trim() || !body.trim() || isPending}
                    whileHover={
                      !title.trim() || !body.trim() || isPending || reduce
                        ? undefined
                        : { scale: 1.03 }
                    }
                    whileTap={
                      !title.trim() || !body.trim() || isPending ? undefined : { scale: 0.97 }
                    }
                    transition={{ duration: 0.2, ease: EASE }}
                    className="group inline-flex items-center gap-2 rounded-lg border-2 border-black bg-accent px-4 py-2 text-label font-semibold text-accent-foreground shadow-hard-sm transition-[box-shadow,translate] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-x-0 disabled:hover:translate-y-0"
                  >
                    {isPending ? 'Posting…' : 'Post Discussion'}
                    {!isPending && (
                      <span
                        aria-hidden
                        className="grid size-6 place-items-center rounded-full border-2 border-black bg-black/10 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:scale-110"
                      >
                        <ArrowUpRight size={11} strokeWidth={2.5} aria-hidden="true" />
                      </span>
                    )}
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
