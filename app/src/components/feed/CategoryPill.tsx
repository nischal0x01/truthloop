/**
 * CategoryPill — coloured chip for a claim category. Uses CATEGORY_META
 * from `@/lib/claims` for label + icon + accent colour.
 */

import { CATEGORY_META, type ClaimCategory } from '@/actions/claims';

interface CategoryPillProps {
  category: ClaimCategory;
  className?: string;
}

const FALLBACK_META = { label: 'Claim', icon: '📋', bg: 'bg-muted', ink: 'text-foreground' };

export function CategoryPill({ category, className = '' }: CategoryPillProps) {
  const meta = CATEGORY_META[category] ?? FALLBACK_META;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border-2 border-black px-2.5 py-1 text-label-small font-medium ${meta.bg} ${meta.ink} ${className}`}
      aria-label={`Category: ${meta.label}`}
    >
      <span aria-hidden="true">{meta.icon}</span>
      <span>{meta.label}</span>
    </span>
  );
}