---
name: frontend-design
description: Guidance for distinctive, intentional visual design when building new UI or reshaping an existing one for Mirror. Helps with aesthetic direction, typography, and making choices that don't read as templated defaults.
---

# Frontend Design — Mirror

Approach this as the design lead at a studio building a media literacy app that shows users their own blind spots. The visual language should feel **clarifying, calm, and trustworthy** — not loud or gamified. Think of a clean mirror surface: subtle, reflective, honest.

## Mirror Visual Identity

The name "Mirror" is the creative anchor. Design choices should reinforce the theme of reflection, truth, and self-knowledge — without being literal about it (no actual mirror imagery unless it serves the UX).

### Color Palette

**Light Mode:**
| Token | Hex | Usage |
|---|---|---|
| `--mirror-slate` | `#64748B` | Secondary text, muted elements |
| `--mirror-surface` | `#F8FAFC` | Page background |
| `--mirror-card` | `#FFFFFF` | Card backgrounds |
| `--mirror-border` | `#E2E8F0` | Subtle borders, dividers |
| `--mirror-text` | `#0F172A` | Primary text |
| `--mirror-heading` | `#020617` | Headlines, emphasis |
| `--mirror-accent` | `#06B6D4` | Cyan — primary actions, highlights |
| `--mirror-success` | `#10B981` | Correct answers |
| `--mirror-error` | `#EF4444` | Wrong answers |
| `--mirror-warning` | `#F59E0B` | Warnings |

**Dark Mode:**
| Token | Hex | Usage |
| `--mirror-slate` | `#94A3B8` | Secondary text |
| `--mirror-surface` | `#0F172A` | Page background |
| `--mirror-card` | `#1E293B` | Card backgrounds |
| `--mirror-border` | `#334155` | Borders |
| `--mirror-text` | `#F1F5F9` | Primary text |
| `--mirror-heading` | `#FFFFFF` | Headlines |
| `--mirror-accent` | `#22D3EE` | Cyan accent (brighter in dark) |
| `--mirror-success` | `#34D399` | Correct answers |
| `--mirror-error` | `#F87171` | Wrong answers |

### Typography

- **Display/Headlines**: `Inter` — clean, modern, highly legible. Weights: 600-800 for headlines.
- **Body**: `Inter` — weights 400-500. Line height 1.6 for readability.
- **Mono/Code**: `JetBrains Mono` — for stats, numbers, data displays.

### Spatial System

- Base unit: `4px`
- Spacing scale: `4, 8, 12, 16, 24, 32, 48, 64, 96px`
- Border radius: `8px` default, `12px` for cards, `16px` for modals
- Max content width: `640px` (focused, readable — newspaper column)

### Motion Philosophy

Motion should feel **natural and clarifying**, never decorative.

- **Entrance**: Subtle fade + gentle rise (translateY 8px → 0), 300ms ease-out. Stagger 50ms between elements.
- **State changes**: 150ms ease-out for hover/focus.
- **Page transitions**: Cross-fade 200ms — calm, no dramatic slides.
- **Feedback animations**:
  - Correct: Brief scale pulse (1 → 1.02 → 1) + success color flash
  - Wrong: Gentle shake (3px horizontal, 300ms)
  - Reveal: Smooth expand/fade for explanation cards
- **Reduced motion**: Respect `prefers-reduced-motion`. Replace all motion with instant state changes.

## Design Principles

### The Claim is the Hero

In the core loop, the claim text is the most important element on screen. It should be:
- Large, readable, centered
- Given the most visual weight and whitespace
- Surrounded by calm, not competing elements

### Restraint in Gamification

This is a game that teaches, not a game that sells. Resist the temptation to:
- Add points animations when you get something right
- Use celebratory confetti or particle effects
- Make correct/incorrect feedback feel like "winning" or "losing"
- Add progress bars that create anxiety

The only gamification: quiet accumulation of points, a final accuracy percentage.

### The Weekly Report is the Punchline

This is where the design should deliver maximum impact. The weekly report should:
- Feel like opening a mirror to see yourself clearly
- Be visually distinct from the quiz flow (consider a different layout rhythm)
- Focus attention on the three key insights (accuracy, blind spot, replay)
- Make the "blind spot" sentence feel personal and meaningful

### Structure is Information

Use layout to encode meaning:
- Numbered claims? Only if order matters (it doesn't in the quiz)
- Visual hierarchy should guide the eye: claim → vote buttons → (after vote) explanation
- The reveal should feel like a natural consequence of the vote, not a new screen

## What NOT to Do

- ❌ No gradients on large surfaces
- ❌ No bouncy/playful animations
- ❌ No heavy shadows or 3D effects
- ❌ More than 2 typefaces
- ❌ Bright saturated colors except the cyan accent
- ❌ Progress bars that create anxiety ("3 more to go!")
- ❌ Leaderboards, badges, streaks
- ❌ Decorative illustrations unless they directly serve comprehension

## Process

1. **Ground every choice in the Mirror concept** — if it doesn't feel clarifying or trustworthy, reconsider
2. **Start with the claim card** — it's the atomic unit of the UI
3. **Build the reveal moment** — this is where the app's personality lives
4. **Design the report** last and give it the most attention
5. **Test with `prefers-reduced-motion`** — the calm experience should work for everyone

## Quick Reference: Tailwind Classes

```css
/* Mirror color tokens in Tailwind */
bg-mirror-surface    /* #F8FAFC light / #0F172A dark */
bg-mirror-card       /* #FFFFFF light / #1E293B dark */
text-mirror-heading  /* #020617 light / #FFFFFF dark */
text-mirror-text     /* #0F172A light / #F1F5F9 dark */
text-mirror-slate    /* #64748B light / #94A3B8 dark */
text-mirror-accent   /* #06B6D4 light / #22D3EE dark */
text-mirror-success  /* #10B981 */
text-mirror-error    /* #EF4444 */
border-mirror-border /* #E2E8F0 light / #334155 dark */
```

Add these to your `tailwind.config.js` as CSS custom properties referenced via `@theme`.
