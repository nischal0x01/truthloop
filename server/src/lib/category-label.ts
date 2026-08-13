/**
 * lib/category-label.ts — single source of truth for category slug → label.
 *
 * Mirrors the frontend's `app/src/actions/reports.ts` helper so the server
 * can render human-friendly category names (e.g. in AI prompts) without
 * importing from the client workspace.
 *
 * If you add a new category, update:
 *   1. `app/src/actions/reports.ts` CATEGORY_LABELS — frontend badges
 *   2. `server/src/ai/schemas.ts` categorySlug enum — AI validation
 *   3. this file — server-side labels
 */

const CATEGORY_LABELS: Record<string, string> = {
  factual_statement: 'Factual statements',
  outdated_info: 'Outdated information',
  misleading_omission: 'Misleading omissions',
  manipulated_stat: 'Manipulated statistics',
  misattributed_quote: 'Misattributed quotes',
  satire_mistaken_as_real: 'Satire mistaken as real',
  survey_stat: 'Survey stats',
  conspiracy_theory: 'Conspiracy framings',
  misattributed_threat: 'Misattributed threats',
  unverified_claim: 'Unverified claims',
};

export function categoryLabel(slug: string | null | undefined): string {
  if (!slug) return 'Unknown';
  return CATEGORY_LABELS[slug] ?? slug.replace(/_/g, ' ');
}
