/**
 * CommentComposer — textarea + submit for a new comment or reply.
 *
 * Owns its own draft + submitting state so a keystroke doesn't re-render the
 * whole thread. Cmd/Ctrl+Enter submits; Escape blurs.
 */

import { useEffect, useRef, useState } from 'react';
import { Loader2, Send } from 'lucide-react';

const MAX_LEN = 2000;

interface CommentComposerProps {
  onSubmit: (body: string) => Promise<void>;
  placeholder?: string;
  submitLabel?: string;
  autoFocus?: boolean;
}

export function CommentComposer({
  onSubmit,
  placeholder = 'Add your take…',
  submitLabel = 'Comment',
  autoFocus = false,
}: CommentComposerProps) {
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  const trimmed = body.trim();
  const tooLong = trimmed.length > MAX_LEN;
  const canSubmit = trimmed.length > 0 && !tooLong && !submitting;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(trimmed);
      setBody(''); // only clear on success, so a failed post isn't lost
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not post that.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="rounded-lg border-2 border-black bg-card focus-within:ring-2 focus-within:ring-black">
        <textarea
          ref={ref}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void submit();
            }
            if (e.key === 'Escape') e.currentTarget.blur();
          }}
          rows={3}
          placeholder={placeholder}
          aria-label={placeholder}
          className="w-full resize-y bg-transparent px-3 py-2.5 text-label-small leading-relaxed outline-none placeholder:text-muted-foreground"
        />

        <div className="flex items-center justify-between gap-3 border-t-2 border-black px-3 py-2">
          <span className="flex items-center gap-2">
            <span
              className={[
                'text-[11px] tabular-nums',
                tooLong ? 'font-semibold text-danger' : 'text-muted-foreground',
              ].join(' ')}
            >
              {trimmed.length}/{MAX_LEN}
            </span>
            <span className="text-[11px] text-muted-foreground hidden sm:inline">
              ⌘+Enter to post
            </span>
          </span>

          <button
            type="button"
            onClick={() => void submit()}
            disabled={!canSubmit}
            className="inline-flex items-center gap-1.5 rounded-lg border-2 border-black bg-accent px-3 py-1.5 text-label-small font-semibold text-accent-foreground shadow-hard-sm transition-all hover:-translate-y-0.5 hover:shadow-hard active:translate-y-0 active:shadow-hard-sm disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0"
          >
            {submitting ? (
              <Loader2 size={13} className="animate-spin" aria-hidden="true" />
            ) : (
              <Send size={13} aria-hidden="true" />
            )}
            {submitLabel}
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-1.5 text-label-small font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
