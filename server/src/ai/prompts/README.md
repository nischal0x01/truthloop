# `server/src/ai/prompts/`

Each AI prompt lives in its own file, paired with a Zod schema in
[`../schemas.ts`](../schemas.ts) and registered as the entry of choice in
[`../index.ts`](../index.ts).

Pattern:

```
prompts/
├── blind-spot-narrative.ts   # prompt + schema helper for the weekly report narrative
├── forecast.ts                # generates /forecast items (Tier-1 task #3)
├── toxicity.ts                # moderates new comments
└── fact-check.ts              # /submit live fact-check
```

Each prompt file should export a single function that returns the
**system** and **prompt** strings, e.g.:

```ts
export function buildBlindSpotNarrativePrompt(input: BlindSpotInput) {
  return {
    system: 'You are a personal media-literacy coach…',
    prompt: 'Write a short supportive narrative about this user's blind spot.',
    userInput: JSON.stringify(input), // → auto-wrapped in <user_input>
  };
}
```

Then the route (or, eventually, a cron) does:

```ts
import { generateStructured, blindSpotNarrativeSchema, blindSpotNarrativeFallback } from '@/ai';
import { buildBlindSpotNarrativePrompt } from '@/ai/prompts/blind-spot-narrative';

const out = await generateStructured({
  ...buildBlindSpotNarrativePrompt({ … }),
  schema: blindSpotNarrativeSchema,
  fallback: blindSpotNarrativeFallback,
});
```
