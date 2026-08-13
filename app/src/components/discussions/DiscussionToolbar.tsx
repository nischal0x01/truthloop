/**
 * DiscussionToolbar — search + category chips + sort, all in one tight band.
 *
 * Layout: search input on the left, chip row in the middle, sort tabs aligned right.
 * The whole band sticks under the hero with a subtle hairline border.
 *
 * State is controlled by the page (parent owns search + chip + sort).
 */

import { Search } from 'lucide-react';
import type { SortOrder } from '@/actions/discussions';
import { CategoryChip } from './CategoryChip';
import { SortTabs } from './SortTabs';

interface DiscussionToolbarProps {
  search: string;
  onSearchChange: (v: string) => void;
  chips: { id: string; label: string; icon?: React.ReactNode; count?: number }[];
  activeChip: string;
  onChipChange: (id: string) => void;
  sort: SortOrder;
  onSortChange: (s: SortOrder) => void;
}

export function DiscussionToolbar({
  search,
  onSearchChange,
  chips,
  activeChip,
  onChipChange,
  sort,
  onSortChange,
}: DiscussionToolbarProps) {
  return (
    <div className="sticky top-[72px] z-30 -mx-6 mt-6 border-y-2 border-black bg-background/90 px-6 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Search + chips */}
        <div className="flex min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative w-full lg:max-w-xs">
            <Search
              size={14}
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-foreground/60"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search discussions…"
              aria-label="Search discussions"
              className="w-full rounded-full border-2 border-black bg-card py-1.5 pl-8 pr-3 text-label-small font-medium shadow-hard-sm outline-none transition-all placeholder:text-foreground/50 focus:bg-background focus:shadow-hard"
            />
          </div>

          <div
            role="tablist"
            aria-label="Filter by category"
            className="flex flex-wrap items-center gap-2 overflow-x-auto"
          >
            {chips.map((chip) => (
              <CategoryChip
                key={chip.id}
                label={chip.label}
                icon={chip.icon}
                count={chip.count}
                active={activeChip === chip.id}
                onClick={() => onChipChange(chip.id)}
              />
            ))}
          </div>
        </div>

        {/* Sort */}
        <div className="shrink-0">
          <SortTabs sort={sort} onSortChange={onSortChange} />
        </div>
      </div>
    </div>
  );
}