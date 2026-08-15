/**
 * BadgeUnlockedModal — the "wow" moment when a user earns a badge.
 *
 * A centered modal with:
 *   - Full-screen backdrop blur (per Gumroad design)
 *   - 40-piece CSS-only confetti burst (see ./Confetti)
 *   - Big animated badge tile with rarity glow
 *   - "Badge unlocked!" headline (rare/epic/legendary get a louder intro)
 *   - Two CTAs: "See profile" (primary) + "Keep playing" (secondary)
 *
 * If multiple badges are unlocked in a single action (rare but possible),
 * we show the first/highest-rarity one and tell the user "+N more in
 * your profile" — same pattern as Material UI's stacked snackbars.
 *
 * Honors `prefers-reduced-motion`: skips confetti + scales, uses fades.
 */

import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Award, ArrowUpRight, Sparkles, X } from 'lucide-react';
import { Confetti } from './Confetti';
import { rarityMeta, type ProfileBadge } from '@/actions/profile';
import { EASE } from '@/lib/motion';

interface BadgeUnlockedModalProps {
  /** Badges unlocked by the most recent action. Empty = modal hidden. */
  badges: ProfileBadge[];
  /** Called when the modal is dismissed (X, backdrop, Escape). */
  onClose: () => void;
}

const RARITY_RANK: Record<ProfileBadge['rarity'], number> = {
  common: 1,
  rare: 2,
  epic: 3,
  legendary: 4,
};

export function BadgeUnlockedModal({ badges, onClose }: BadgeUnlockedModalProps) {
  const reduce = useReducedMotion();

  // Pick the most-impactful badge to feature. Stable across renders so
  // the entrance animation doesn't re-trigger when the user types.
  const featured = useMemo(() => {
    if (badges.length === 0) return null;
    return [...badges].sort((a, b) => RARITY_RANK[b.rarity] - RARITY_RANK[a.rarity])[0] ?? null;
  }, [badges]);

  const extraCount = badges.length - 1;

  // Escape closes
  useEffect(() => {
    if (!featured) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [featured, onClose]);

  // Body scroll lock while open
  useEffect(() => {
    if (!featured) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [featured]);

  return (
    <AnimatePresence>
      {featured && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="badge-unlocked-title"
          aria-describedby="badge-unlocked-desc"
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            aria-hidden
            className="absolute inset-0 bg-black/55 backdrop-blur-md"
          />

          {/* Confetti */}
          <Confetti />

          {/* Modal */}
          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.7, y: 20, filter: 'blur(8px)' }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9, y: 10 }}
            transition={{ duration: 0.7, ease: EASE }}
            className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border-2 border-black bg-card shadow-hard-lg"
          >
            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute right-3 top-3 z-20 grid size-9 place-items-center rounded-full border-2 border-black bg-card shadow-hard-sm transition-all hover:bg-muted hover:-translate-x-0.5 hover:-translate-y-0.5"
            >
              <X size={14} strokeWidth={2.5} aria-hidden />
            </button>

            {/* Card body */}
            <div className="px-7 pb-7 pt-9 sm:px-8">
              {/* Eyebrow + sparkle */}
              <div className="flex items-center justify-center gap-2">
                <motion.span
                  initial={{ rotate: -10, scale: 0.8 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ duration: 0.6, delay: 0.2, ease: EASE }}
                  aria-hidden
                  className="grid size-7 place-items-center rounded-full border-2 border-black bg-yellow text-foreground shadow-hard-sm"
                >
                  <Sparkles size={12} strokeWidth={2.5} />
                </motion.span>
                <span className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/70">
                  Badge unlocked
                </span>
              </div>

              {/* Big badge tile */}
              <div className="mt-5 flex justify-center">
                <motion.div
                  initial={reduce ? { opacity: 0 } : { scale: 0, rotate: -180 }}
                  animate={reduce ? { opacity: 1 } : { scale: 1, rotate: 0 }}
                  transition={{
                    type: 'spring',
                    damping: 12,
                    stiffness: 200,
                    delay: 0.3,
                  }}
                  className="grid size-28 place-items-center rounded-2xl border-2 border-black bg-yellow text-5xl shadow-hard"
                  style={{
                    boxShadow: rarityGlow(featured.rarity),
                  }}
                >
                  <span aria-hidden>{featured.icon}</span>
                </motion.div>
              </div>

              {/* Rarity chip */}
              <div className="mt-4 flex justify-center">
                <span
                  className={[
                    'inline-flex items-center gap-1.5 rounded-full border-2 border-black px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider',
                    rarityMeta(featured.rarity).bg,
                    rarityMeta(featured.rarity).ink,
                  ].join(' ')}
                >
                  <Award size={10} strokeWidth={2.5} aria-hidden />
                  {rarityMeta(featured.rarity).label}
                </span>
              </div>

              {/* Name + description */}
              <h2
                id="badge-unlocked-title"
                className="mt-4 text-center font-display text-heading-1 font-bold leading-tight tracking-display"
              >
                {featured.name}
              </h2>
              <p
                id="badge-unlocked-desc"
                className="mt-2 text-center text-label leading-label text-foreground/75"
              >
                {featured.description}
              </p>

              {/* Extra badges hint */}
              {extraCount > 0 && (
                <p className="mt-3 text-center text-label-small font-semibold text-foreground/60">
                  +{extraCount} more in your profile
                </p>
              )}

              {/* CTAs */}
              <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
                <Link
                  to="/profile"
                  onClick={onClose}
                  className="group inline-flex flex-1 items-center justify-center gap-2 rounded-full border-2 border-black bg-foreground px-5 py-3 font-semibold text-background shadow-hard-sm transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard"
                >
                  See profile
                  <span
                    aria-hidden
                    className="grid size-6 place-items-center rounded-full border-2 border-black bg-background/20 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:scale-110"
                  >
                    <ArrowUpRight size={11} strokeWidth={2.5} />
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border-2 border-black bg-card px-5 py-3 font-semibold text-foreground shadow-hard-sm transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-muted hover:shadow-hard"
                >
                  Keep playing
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/** Rarity-tinted glow ring around the badge tile. */
function rarityGlow(rarity: ProfileBadge['rarity']): string {
  switch (rarity) {
    case 'common':
      return '0 0 0 4px rgba(0,0,0,0.06), 0 24px 60px -20px rgba(0,0,0,0.45)';
    case 'rare':
      return '0 0 0 4px rgba(255,144,232,0.4), 0 24px 60px -20px rgba(0,0,0,0.45)';
    case 'epic':
      return '0 0 0 4px rgba(255,201,0,0.5), 0 24px 60px -20px rgba(0,0,0,0.45)';
    case 'legendary':
      return '0 0 0 4px rgba(220,52,30,0.5), 0 24px 60px -20px rgba(0,0,0,0.45)';
  }
}

export default BadgeUnlockedModal;
