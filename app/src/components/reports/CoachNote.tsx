/**
 * CoachNote — the inline AI "coach" voice that appears across the
 * Weekly Blind-Spot report. Two size variants:
 *
 *   - `inline` — small Sparkles + italic muted line, no border. Tucks under
 *     a section heading so the user reads it as an aside from the chart.
 *   - `card` — full-width card with eyebrow + larger italic line. Used once
 *     per report as the closing "Coach's prescription".
 *
 * Both variants render nothing when `children` is empty / null, so the page
 * can drop them in unconditionally and they'll skip silently on no-data
 * sections (e.g. no replay claim, no blind spot).
 *
 * Animation rides the parent stagger when used inside the Weekly report's
 * `motion.div` (the page sets `staggerChildren: 0.1, delayChildren: 0.4`).
 * `useReducedMotion()` falls back to opacity-only motion per project
 * convention.
 */

import { motion, useReducedMotion } from 'motion/react';
import { Sparkles } from 'lucide-react';
import { EASE } from '@/lib/motion';

interface CoachNoteProps {
  /** When empty / null the component returns null — never renders an empty
   *  container. */
  children: string | null | undefined;
  /** Visual size — see file header. */
  size?: 'inline' | 'card';
  /** Optional eyebrow shown above the line in `card` size. Defaults to
   *  "Coach's prescription". Ignored in `inline` size. */
  eyebrow?: string;
  /** Override icon for advanced layouts. Defaults to a small pink Sparkles. */
  icon?: React.ReactNode;
  /** Pass `dark` when rendering inside the Blind-spot dark panel. */
  tone?: 'light' | 'dark';
}

const fadeUp = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0 },
};

export function CoachNote({
  children,
  size = 'inline',
  eyebrow = "Coach's prescription",
  icon,
  tone = 'light',
}: CoachNoteProps) {
  const reduce = useReducedMotion();
  const text = typeof children === 'string' ? children.trim() : '';
  if (!text) return null;

  const isDark = tone === 'dark';

  if (size === 'card') {
    return (
      <motion.aside
        variants={reduce ? undefined : fadeUp}
        transition={{ duration: 0.6, ease: EASE }}
        className="rounded-4xl border-2 border-black bg-card p-6 shadow-hard sm:p-8"
      >
        <div className="flex items-center gap-2 text-label-small font-semibold uppercase tracking-wider text-foreground/60">
          {icon ?? <Sparkles className="size-3.5 text-pink-accent" aria-hidden />}
          {eyebrow}
        </div>
        <div className="mt-3 flex gap-3 sm:gap-4">
          <Sparkles
            className="mt-1 size-5 shrink-0 text-pink-accent"
            aria-hidden
            strokeWidth={2}
          />
          <p className="font-display text-heading-3 font-medium italic leading-heading-3 tracking-display text-foreground sm:text-heading-2 sm:leading-heading-2">
            {text}
          </p>
        </div>
      </motion.aside>
    );
  }

  // `inline` size — tucked under a section heading. Always non-dark friendly.
  return (
    <motion.div
      variants={reduce ? undefined : fadeUp}
      transition={{ duration: 0.5, ease: EASE }}
      data-tone={tone}
      className="flex items-start gap-2 sm:gap-2.5"
    >
      <Sparkles
        className={[
          'mt-1 size-3.5 shrink-0',
          isDark ? 'text-pink-accent' : 'text-pink-accent',
        ].join(' ')}
        strokeWidth={2.25}
        aria-hidden
      />
      <p
        className={[
          'text-label font-medium italic leading-label',
          isDark ? 'text-white/75' : 'text-foreground/75',
        ].join(' ')}
      >
        {text}
      </p>
    </motion.div>
  );
}
