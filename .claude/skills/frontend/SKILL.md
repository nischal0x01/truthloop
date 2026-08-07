---
name: frontend
description: Frontend development guidance for Mirror. Covers component patterns, state management, Supabase integration, and common tasks.
---

# Frontend — Mirror

React + Vite + TypeScript + Tailwind CSS v4. Located in `app/`.

## Quick Start

```bash
npm run dev:app        # Start dev server at http://localhost:5173
npm run build:app      # Production build → app/dist
```

## Tech Stack

- **React 19** with hooks
- **Vite 7** for bundling and HMR
- **Tailwind CSS v4** — uses `@theme inline` in CSS, not `tailwind.config.js`
- **shadcn/ui** components — in `app/src/components/ui/`
- **Path aliases** — `@/*` maps to `app/src/*`

## Tailwind v4 Theme

The theme is defined in `app/src/index.css` using CSS custom properties under `@theme inline`. Key tokens:

```css
/* Mirror palette */
--color-mirror-surface: oklch(...);   /* Page background */
--color-mirror-card: oklch(...);      /* Card backgrounds */
--color-mirror-accent: oklch(...);    /* Cyan accent */
--color-mirror-success: oklch(...);    /* Correct answers */
--color-mirror-error: oklch(...);      /* Wrong answers */
--color-mirror-heading: oklch(...);    /* Headlines */
--color-mirror-text: oklch(...);       /* Body text */
```

## Adding Components

```bash
# Add a shadcn/ui component
npx shadcn@latest add button
# Then import:
import { Button } from '@/components/ui/button';
```

## Component Structure

```
app/src/
├── components/
│   ├── ui/              # shadcn/ui components
│   │   ├── button.tsx
│   │   └── card.tsx
│   └── [feature]/       # Feature-specific components
├── lib/
│   └── utils.ts         # cn() helper, etc.
├── App.tsx              # Root component
├── main.tsx             # Entry point
└── index.css            # Global styles + theme
```

## Supabase Integration (when added)

```typescript
// Create a Supabase client
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

## Key Patterns

### Claim Card (Quiz Item)

```tsx
const ClaimCard = ({ claim, onVote }: { 
  claim: { text: string }; 
  onVote: (answer: 'real' | 'fake') => void;
}) => (
  <Card className="max-w-xl mx-auto p-8">
    <h2 className="text-2xl font-semibold text-mirror-heading mb-6">
      {claim.text}
    </h2>
    <div className="flex gap-4">
      <Button onClick={() => onVote('real')}>Real</Button>
      <Button onClick={() => onVote('fake')}>Fake</Button>
    </div>
  </Card>
);
```

### State Machine for Quiz Flow

```typescript
type QuizState = 'guessing' | 'revealed' | 'complete';

const [state, setState] = useState<QuizState>('guessing');
const [currentIndex, setCurrentIndex] = useState(0);
```

## Common Tasks

### Fetch claims from backend

```typescript
const res = await fetch('http://localhost:3000/api/claims');
const claims = await res.json();
```

### Save a guess to Supabase

```typescript
await supabase.from('guesses').insert({
  claim_id: claim.id,
  user_answer: vote,
  is_correct: vote === claim.verdict
});
```

### Animate on reveal (using Tailwind + tw-animate-css)

```tsx
<AnimatePresence>
  {state === 'revealed' && (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
    >
      <ExplanationCard claim={claim} />
    </motion.div>
  )}
</AnimatePresence>
```

## Gotchas

- Tailwind v4 uses `@theme inline` instead of `tailwind.config.js` — don't create a config file
- Path aliases are configured in `tsconfig.app.json` and `vite.config.ts`
- Don't import from `~` — use `@/` for path aliases
- The `tw-animate-css` package is already installed for animations
