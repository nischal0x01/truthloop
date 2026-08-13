/**
 * RangePicker — Week / Month / 3 months / Custom chip row + custom-range modal.
 *
 * Synced to the URL via `useSearchParams`, so links are shareable:
 *   /reports/weekly?range=quarter
 *   /reports/weekly?range=custom&from=2026-08-01&to=2026-08-10
 *
 * The active chip wears a single `motion.span layoutId="range-chip-pill"`
 * that animates between options — same pattern as `SortTabs.tsx`.
 */

import { useCallback, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CalendarRange, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { useSearchParams } from 'react-router-dom';
import {
  toDateInputValue,
  formatRange,
  weekStart,
  monthStart,
  quarterStart,
} from '@/lib/date';
import {
  rangeToParams,
  type Range,
  type RangeKind,
} from '@/actions/reports';
import { EASE } from '@/lib/motion';

const PRESETS: { kind: RangeKind; label: string }[] = [
  { kind: 'week', label: 'Week' },
  { kind: 'month', label: 'Month' },
  { kind: 'quarter', label: '3 months' },
  { kind: 'custom', label: 'Custom' },
];

interface RangePickerProps {
  range: Range;
  onChange: (range: Range) => void;
  /** While a fresh report is fetching, dim the chips (visual feedback). */
  isLoading?: boolean;
}

export function RangePicker({ range, onChange, isLoading }: RangePickerProps) {
  const [, setSearchParams] = useSearchParams();
  const [customOpen, setCustomOpen] = useState(false);

  // Local modal state — only commits to URL / parent on Apply.
  const seedFrom = useMemo(
    () => range.from ?? toDateInputValue(weekStart(new Date())),
    [range.from]
  );
  const seedTo = useMemo(
    () => range.to ?? toDateInputValue(new Date()),
    [range.to]
  );
  const [draftFrom, setDraftFrom] = useState(seedFrom);
  const [draftTo, setDraftTo] = useState(seedTo);

  const handlePresetClick = useCallback(
    (kind: RangeKind) => {
      if (kind === 'custom') {
        setCustomOpen(true);
        return;
      }
      const next: Range = { kind };
      onChange(next);
      setSearchParams(rangeToParams(next), { replace: true });
    },
    [onChange, setSearchParams]
  );

  const handleApplyCustom = useCallback(() => {
    // Validation
    if (!draftFrom || !draftTo) return;
    if (new Date(draftTo).getTime() < new Date(draftFrom).getTime()) return;

    const next: Range = { kind: 'custom', from: draftFrom, to: draftTo };
    onChange(next);
    setSearchParams(rangeToParams(next), { replace: true });
    setCustomOpen(false);
  }, [draftFrom, draftTo, onChange, setSearchParams]);

  const showRangeLabel = range.kind !== 'week';
  const from = range.from ? new Date(range.from) : null;
  const to = range.to ? new Date(range.to) : null;
  const resolvedFrom = from ?? weekStart(new Date());
  const resolvedTo = to ?? new Date();
  const rangeLabel =
    range.kind === 'week'
      ? formatRange(weekStart(new Date()), new Date())
      : range.kind === 'month'
      ? formatRange(monthStart(new Date()), new Date())
      : range.kind === 'quarter'
      ? formatRange(quarterStart(new Date()), new Date())
      : formatRange(resolvedFrom, resolvedTo);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div
        role="radiogroup"
        aria-label="Time range"
        className="inline-flex flex-wrap items-center gap-1 rounded-full border-2 border-black bg-card p-1 shadow-hard-sm"
      >
        {PRESETS.map((preset) => {
          const isActive = range.kind === preset.kind;
          return (
            <button
              key={preset.kind}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => handlePresetClick(preset.kind)}
              className={[
                'relative inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-label-small font-semibold transition-colors',
                isActive
                  ? 'text-accent-foreground'
                  : 'text-foreground/70 hover:text-foreground',
                isLoading ? 'opacity-70' : '',
              ].join(' ')}
            >
              {isActive && (
                <motion.span
                  layoutId="range-chip-pill"
                  className="absolute inset-0 rounded-full bg-accent"
                  transition={{ duration: 0.45, ease: EASE }}
                  aria-hidden
                />
              )}
              <span className="relative">
                {preset.label}
                {preset.kind === 'custom' && (
                  <CalendarRange
                    size={11}
                    aria-hidden="true"
                    className="ml-1 inline-block opacity-70"
                  />
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* Range label badge */}
      <AnimatePresence mode="popLayout">
        {showRangeLabel && (
          <motion.span
            key={rangeLabel}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="inline-flex items-center gap-1.5 self-start rounded-full border-2 border-black bg-yellow px-3 py-1 text-label-small font-semibold sm:self-auto"
          >
            {rangeLabel}
          </motion.span>
        )}
      </AnimatePresence>

      <Modal
        open={customOpen}
        onClose={() => setCustomOpen(false)}
        title="Custom range"
      >
        <p className="mb-4 text-label text-foreground/75">
          Pick a window you want to read your blind-spot against. We&apos;ll
          pull every vote you cast in that range and resurface the category
          you tripped on most.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <DateField
            label="From"
            value={draftFrom}
            max={draftTo}
            onChange={setDraftFrom}
          />
          <DateField
            label="To"
            value={draftTo}
            min={draftFrom}
            onChange={setDraftTo}
          />
        </div>

        {draftFrom && draftTo && new Date(draftTo) < new Date(draftFrom) && (
          <p className="mt-3 text-label-small font-semibold text-red">
            To must be on or after From.
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setCustomOpen(false)}
            className="rounded-lg border-2 border-black bg-card px-4 py-2 text-label font-semibold shadow-sm transition-colors hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApplyCustom}
            disabled={
              !draftFrom ||
              !draftTo ||
              new Date(draftTo) < new Date(draftFrom)
            }
            className="inline-flex items-center gap-2 rounded-lg border-2 border-black bg-accent px-4 py-2 text-label font-semibold text-accent-foreground shadow-sm transition-shadow hover:shadow-hard disabled:cursor-not-allowed disabled:opacity-50"
          >
            Apply
            <Loader2 size={12} className="opacity-0" aria-hidden="true" />
          </button>
        </div>
      </Modal>
    </div>
  );
}

function DateField({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  min?: string;
  max?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-label-small font-semibold uppercase tracking-wider text-foreground/70">
        {label}
      </span>
      <input
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border-2 border-black bg-card px-3 py-2 text-label shadow-hard-sm outline-none transition-shadow focus:ring-2 focus:ring-black"
      />
    </label>
  );
}
