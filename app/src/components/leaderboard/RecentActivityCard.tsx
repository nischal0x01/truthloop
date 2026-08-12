/**
 * RecentActivityCard — sidebar card showing the global feed of recent
 * actions (votes cast, badges earned).
 *
 * Each row has:
 *   - Small avatar
 *   - Sentence: "<user> <action> <target>"
 *   - Time stamp
 *   - Right-aligned outcome chip (✓ correct, ✕ wrong, or — for badges)
 *
 * Stagger fade-up reveal; outcome icon does a spring rotate-in.
 */

import { Award, Check, X } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { UserAvatar } from '@/components/auth/UserAvatar';
import { EASE } from '@/lib/motion';

export interface ActivityEntry {
  id: string;
  user: string;
  action: 'voted on' | 'earned badge';
  target: string;
  /** true = correct vote, false = wrong vote, null = non-vote (e.g. badge) */
  correct: boolean | null;
  time: string;
}

interface RecentActivityCardProps {
  entries: ActivityEntry[];
}

export function RecentActivityCard({ entries }: RecentActivityCardProps) {
  const reduce = useReducedMotion();

  return (
    <motion.section
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE, delay: 0.1 }}
      className="rounded-lg border-2 border-black bg-card p-6 shadow-hard"
      aria-label="Recent activity"
    >
      <div className="mb-4 flex items-center gap-2">
        <span className="grid size-7 place-items-center rounded-md border-2 border-black bg-accent text-accent-foreground">
          <Award size={14} aria-hidden="true" />
        </span>
        <h3 className="font-display text-heading-3 font-semibold">Recent Activity</h3>
      </div>

      <ul className="space-y-3" role="list">
        {entries.map((a, i) => (
          <motion.li
            key={a.id}
            initial={reduce ? false : { opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, ease: EASE, delay: 0.2 + i * 0.07 }}
            className="flex items-start gap-3 text-label-small"
          >
            <UserAvatar
              src={null}
              name={a.user}
              size={28}
              className="shrink-0 border border-black"
              fallbackClassName="bg-muted text-foreground text-[10px]"
            />
            <div className="min-w-0 flex-1">
              <p className="leading-tight">
                <span className="font-semibold">{a.user}</span> {a.action}{' '}
                <span className="font-medium">{a.target}</span>
              </p>
              <p className="text-[10px] text-muted-foreground">{a.time}</p>
            </div>
            {a.correct !== null && (
              <motion.span
                aria-hidden
                initial={reduce ? false : { scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', damping: 12, stiffness: 280, delay: 0.35 + i * 0.07 }}
                className={[
                  'grid size-5 shrink-0 place-items-center rounded-full border text-[10px] font-bold',
                  a.correct
                    ? 'border-real bg-real/20 text-real'
                    : 'border-fake bg-fake/20 text-fake',
                ].join(' ')}
              >
                {a.correct ? <Check size={11} aria-hidden="true" /> : <X size={11} aria-hidden="true" />}
              </motion.span>
            )}
          </motion.li>
        ))}
      </ul>
    </motion.section>
  );
}
