/**
 * MobileMenuDrawer — shared hamburger-menu + slide-in drawer for the
 * landing nav and the in-app nav.
 *
 * Why this exists: both navs use `hidden md:flex` on the inline link list,
 * which leaves < md (≤ 767 px) with no navigation at all. This component
 * renders a hamburger button (visible `md:hidden`) that opens a slide-in
 * panel from the right, with a click-away backdrop and Escape-to-close.
 *
 * Design tokens respected:
 *   - 1px black borders via `border-2 border-black`
 *   - No `box-shadow` — uses `.shadow-hard` offset utility
 *   - Off-white panel (`bg-background`) matching the rest of the app
 *   - Pink-accent hover follows the rest of the app's interactive pattern
 *
 * Accessibility:
 *   - Hamburger exposes `aria-expanded` + `aria-controls`
 *   - Panel uses `role="dialog"` + `aria-modal="true"`
 *   - Esc key closes; backdrop click closes; body scroll locked while open
 */

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Menu, X } from 'lucide-react';
import { EASE } from '@/lib/motion';

interface MobileMenuDrawerProps {
  /** Optional id for the drawer panel; auto-generated when omitted. */
  panelId?: string;
  /** Render-prop receives `close()` so menu items can dismiss on click. */
  children: (close: () => void) => ReactNode;
  /** Accessible label for the hamburger trigger. */
  triggerLabel?: string;
}

export function MobileMenuDrawer({
  panelId,
  children,
  triggerLabel = 'Open menu',
}: MobileMenuDrawerProps) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  const autoId = useId();
  const id = panelId ?? `mobile-menu-${autoId}`;
  const closeRef = useRef<HTMLButtonElement | null>(null);

  // Lock body scroll while the drawer is open + Escape-to-close.
  useEffect(() => {
    if (!open) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);

    // Move focus to the close button on open so screen readers land inside the panel.
    closeRef.current?.focus();

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <>
      {/* Hamburger trigger — only visible below md */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={triggerLabel}
        aria-expanded={open}
        aria-controls={id}
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border-2 border-black bg-background shadow-hard-sm hover-lift md:hidden"
      >
        <Menu size={18} aria-hidden="true" />
      </button>

      {/* Portal the panel so z-index + stacking escape any header overflow:hidden */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {open && (
              <>
                {/* Backdrop */}
                <motion.button
                  type="button"
                  aria-label="Close menu"
                  tabIndex={-1}
                  onClick={close}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, ease: EASE }}
                  className="fixed inset-0 z-50 bg-black/50"
                />

                {/* Slide-in panel */}
                <motion.div
                  id={id}
                  role="dialog"
                  aria-modal="true"
                  aria-label={triggerLabel}
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '100%' }}
                  transition={{ type: 'tween', duration: 0.32, ease: EASE }}
                  className="fixed inset-y-0 right-0 z-50 flex w-[85vw] max-w-sm flex-col border-l-2 border-black bg-background shadow-hard"
                >
                  {/* Panel header — close button */}
                  <div className="flex items-center justify-between border-b-2 border-black px-5 py-4">
                    <span className="font-display text-heading-3">Menu</span>
                    <button
                      ref={closeRef}
                      type="button"
                      onClick={close}
                      aria-label="Close menu"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border-2 border-black bg-background hover-lift"
                    >
                      <X size={16} aria-hidden="true" />
                    </button>
                  </div>

                  {/* Scrollable link area */}
                  <nav aria-label="Mobile primary" className="flex-1 overflow-y-auto px-5 py-4">
                    {children(close)}
                  </nav>
                </motion.div>
              </>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}