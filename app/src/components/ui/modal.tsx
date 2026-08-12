/**
 * Modal — simple styled confirmation dialog matching the Gumroad design system.
 * Replaces window.alert / window.confirm / window.prompt.
 */
import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, children, className = '' }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            ref={overlayRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className={`fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border-2 border-black bg-card shadow-hard-lg ${className}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'modal-title' : undefined}
          >
            {title && (
              <div className="flex items-center justify-between border-b-2 border-black px-5 py-4">
                <h2 id="modal-title" className="font-display text-heading-3 font-semibold">{title}</h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="grid size-8 shrink-0 place-items-center rounded-lg border-2 border-black bg-card shadow-sm transition-all hover:bg-muted"
                  aria-label="Close"
                >
                  <X size={14} strokeWidth={2.5} />
                </button>
              </div>
            )}
            <div className="p-5">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/** Reusable confirm dialog */
interface ConfirmProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

export function Confirm({
  open,
  onClose,
  onConfirm,
  title = 'Confirm',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
}: ConfirmProps) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-label text-foreground/80 mb-5">{message}</p>
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border-2 border-black bg-card px-4 py-2 text-label font-semibold shadow-sm hover:bg-muted"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={() => { onConfirm(); onClose(); }}
          className={`rounded-lg border-2 border-black px-4 py-2 text-label font-semibold shadow-sm ${
            destructive
              ? 'bg-red text-white hover:bg-red/90'
              : 'bg-accent hover:bg-accent/90'
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

/** Simple prompt replacement */
interface PromptProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (value: string) => void;
  title?: string;
  message?: string;
  placeholder?: string;
  defaultValue?: string;
  submitLabel?: string;
}

export function Prompt({
  open,
  onClose,
  onSubmit,
  title = 'Enter value',
  message,
  placeholder = '',
  defaultValue = '',
  submitLabel = 'OK',
}: PromptProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(inputRef.current?.value ?? '');
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={title}>
      {message && <p className="text-label text-foreground/80 mb-3">{message}</p>}
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          ref={inputRef}
          type="url"
          defaultValue={defaultValue}
          placeholder={placeholder}
          className="w-full rounded-lg border-2 border-black bg-card px-3 py-2 text-label shadow-hard-sm outline-none focus:ring-2 focus:ring-black"
        />
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border-2 border-black bg-card px-4 py-2 text-label font-semibold shadow-sm hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-lg border-2 border-black bg-accent px-4 py-2 text-label font-semibold shadow-sm hover:bg-accent/90"
          >
            {submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
