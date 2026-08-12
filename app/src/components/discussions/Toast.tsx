/**
 * Toast — bottom-right notifications for /discussions.
 *
 * Stack of dismissible toasts with a 3.5-second progress bar timer.
 * Auto-dismisses via the parent's setTimeout (handled at the page level).
 *
 * Layout:
 *   - Container: pointer-events-none so clicks pass through; each toast re-enables it.
 *   - Bar: scaleX 1→0 over 3.5s, transform-origin left.
 *   - Layout prop re-orders the stack smoothly when items come/go.
 */

import { AlertCircle, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { EASE } from '@/lib/motion';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed bottom-6 right-6 z-50 flex flex-col gap-2"
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, y: 20, scale: 0.92, x: 24 }}
            animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
            exit={{ opacity: 0, x: 24, scale: 0.95 }}
            transition={{ duration: 0.35, ease: EASE }}
            className={[
              'pointer-events-auto relative flex items-center gap-2 overflow-hidden rounded-lg border-2 border-black px-4 py-3 shadow-hard',
              toast.type === 'success' ? 'bg-real text-real-foreground' : '',
              toast.type === 'error' ? 'bg-danger text-danger-foreground' : '',
              toast.type === 'info' ? 'bg-accent text-accent-foreground' : '',
            ].join(' ')}
          >
            <motion.span
              aria-hidden
              initial={toast.type === 'success' ? { scale: 0, rotate: -90 } : false}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', damping: 12, stiffness: 280 }}
            >
              {toast.type === 'success' && <Check size={16} aria-hidden="true" />}
              {toast.type === 'error' && <AlertCircle size={16} aria-hidden="true" />}
              {toast.type === 'info' && <AlertCircle size={16} aria-hidden="true" />}
            </motion.span>
            <span className="pr-7 text-label font-semibold">{toast.message}</span>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="absolute right-1 top-1 grid size-7 place-items-center rounded-md transition-colors hover:bg-black/15"
              aria-label="Dismiss"
            >
              <X size={14} aria-hidden="true" />
            </button>
            <motion.span
              aria-hidden
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: 3.5, ease: 'linear' }}
              style={{ transformOrigin: 'left center' }}
              className={[
                'absolute bottom-0 left-0 h-0.5 w-full',
                toast.type === 'success' ? 'bg-white/70' : '',
                toast.type === 'error' ? 'bg-white/70' : '',
                toast.type === 'info' ? 'bg-black/30' : '',
              ].join(' ')}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
