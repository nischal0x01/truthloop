# Project Context: Mirror
### Gamified Media & Information Literacy App — UNESCO MIL Hackathon

> Mirror shows users their own blind spots in media literacy — turning a quiz into self-knowledge.

---

## 1. The One-Sentence Idea

Users guess real-vs-fake on controversial claims, get the AI-verified truth immediately after, and at the end of the week get a **personalized report showing exactly what kind of misinformation fools them** — turning a quiz into self-knowledge.

**Focus Area:** AI and MIL
**Category:** Application/Website
**Project Name:** Mirror

---

## 2. Why This Wins (keep this framing in your pitch, don't drift from it)

Fake-vs-real news quiz games already exist (Factitious, Bad News, etc.) — a judge who's seen a few MIL hackathons will recognize the format instantly. **Your quiz mechanic is not the innovation. Say this out loud in your pitch, then pivot immediately to what is:**

> "Most MIL tools tell everyone the same advice. We show each person their own blind spot."

The weekly personalized report — "you got fooled by manipulated statistics 3 times this week, but you're great at spotting fake quotes" — is the actual differentiator. It's the difference between a fitness app that just logs workouts vs. one that tells you *your* specific weakness. Everything you build should protect time and attention for making this one feature excellent. Do not let scope creep dilute it.

---

## 3. Core Loop (this is the entire product — resist adding more)

```
1. User sees a claim (headline/snippet), no verdict shown
2. User guesses: Real / Fake
3. Reveal: verdict + 2-3 sentence explanation + source link
4. Correct/incorrect recorded silently, next claim shown
5. Repeat for 5-10 claims per session
   ↓
End of week → Personalized Report (see Section 5) — THE hero feature
```

No streaks, no leaderboards, no badges, no ranks, no confidence sliders. Points are the only gamification element you need — they're enough to make it feel like a game, and they feed nothing but the report.

---

## 4. What NOT to Build (say no to these, even if they sound cool mid-hackathon)

- ❌ Live news scraping / real-time ingestion — use a pre-written claim set
- ❌ Full RAG pipeline over the live web — pre-verify your claims by hand, write the explanations yourself, it'll be more accurate and reliable than live retrieval anyway
- ❌ Leaderboards, ranks, badges, streaks
- ❌ Multi-language support
- ❌ Mobile app
- ❌ User-submitted claims
- ❌ Social sharing infrastructure

Every one of these is a legitimate v2 idea. Mention them as "roadmap" in your pitch deck — judges like seeing you know where you could go, but building none of them protects you from a broken demo.

---

## 5. The Weekly Report — spend most of your design time here

This is your entire pitch. Everything else exists to generate data for this screen.

**Content (keep to exactly these 3 parts):**
1. **Accuracy** — "You got 12/16 right this week"
2. **Your blind spot** — one sentence naming the category of claim they got wrong most, e.g. "You're most often fooled by misleading statistics" (computed from a `category` tag on each claim)
3. **One replay** — show the single claim they got most confidently/clearly wrong again, with its explanation, as the memorable takeaway

That's it. No comparison charts, no trend graphs, no multi-week history for MVP — a clean, well-designed single card is more impressive live than a half-built analytics dashboard.

For the hackathon demo, **pre-seed one full example report** for a demo account so judges see the finished feature even if a real user hasn't played a full week yet.

---

## 6. Data You Need to Collect (minimum viable)

```
Claim
 - id, text, verdict (real/fake), category (e.g. "manipulated stat",
   "out-of-context quote", "satire mistaken as real", "old news resurfacing"),
   explanation, source_url

Guess
 - id, user_id, claim_id, user_answer, is_correct, timestamp
```

That's the whole schema. The category tag on each claim is the single most important field — it's what makes the weekly report personal instead of generic.

---

## 7. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend + Backend | Next.js (single repo) | One codebase, fast to deploy, no separate backend to stand up |
| Auth + DB | Supabase (Postgres + Auth) | Auth working in minutes, generous free tier |
| Report generation | Simple aggregation query + Claude API for the one-sentence narrative | No need for a scheduled job — generate on-demand when user visits the report page |
| Styling | Tailwind CSS v4 | Fast, looks clean by default |
| Hosting | Vercel | One-command deploy, reliable for live demo |

---

## 8. Claim Dataset (build this first, before any code)

Write **15-20 claims by hand** before touching the app:
- Mix real and fake roughly 50/50
- Tag each with a category (see Section 6)
- Write your own 2-3 sentence explanation + one real source link for each — don't rely on an LLM to fact-check live during the hackathon
- Pick claims your audience will recognize (skew toward Nepal/South Asia + globally well-known controversies)

This is the highest-leverage 2 hours of the entire hackathon.

---

## 9. Build Order (in priority order — stop anywhere and still have a demo)

1. Claim dataset (Section 8) — do this first, by hand
2. Static guess → reveal flow, no auth, no database (hardcoded claims array) — get the core loop *feeling good* first
3. Add Supabase auth + save guesses to DB
4. Build the weekly report screen off real (or seeded) guess data
5. Visual polish pass — this is what judges remember
6. (Only if time remains) anything from the "what not to build" list

If you run out of time at step 3 or 4, you still have a demoable product.

---

## 10. Pitch Structure (60-90 seconds)

1. **Hook**: "Everyone gets the same MIL advice. But you and I are fooled by different things." (10s)
2. **Demo the core loop live** — 2 claims, guess, reveal (20s)
3. **Demo the weekly report** — this is the moment to slow down (20s)
4. **The insight**: name-drop that this mirrors how real MIL trainers work with individuals (10s)
5. **Honesty about AI limits** — "we hand-verified our claims for reliability" (10s)
6. **Roadmap in one sentence** (10s)

---

## 11. Design System — Mirror Visual Identity

### Concept
Mirror reflects truth. The visual language should feel **clarifying, calm, and trustworthy** — not loud or gamified. Think of a clean mirror surface: subtle, reflective, honest. The experience should feel like looking at yourself clearly, not being sold something.

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
| `--mirror-accent` | `#06B6D4` | Cyan — primary actions, highlights (mirror-like, truth) |
| `--mirror-success` | `#10B981` | Correct answers, positive feedback |
| `--mirror-error` | `#EF4444` | Wrong answers, destructive actions |
| `--mirror-warning` | `#F59E0B` | Warnings, attention needed |

**Dark Mode:**
| Token | Hex | Usage |
|---|---|---|
| `--mirror-slate` | `#94A3B8` | Secondary text, muted elements |
| `--mirror-surface` | `#0F172A` | Page background |
| `--mirror-card` | `#1E293B` | Card backgrounds |
| `--mirror-border` | `#334155` | Subtle borders, dividers |
| `--mirror-text` | `#F1F5F9` | Primary text |
| `--mirror-heading` | `#FFFFFF` | Headlines, emphasis |
| `--mirror-accent` | `#22D3EE` | Cyan — primary actions (brighter in dark) |
| `--mirror-success` | `#34D399` | Correct answers |
| `--mirror-error` | `#F87171` | Wrong answers |
| `--mirror-warning` | `#FBBF24` | Warnings |

### Typography

- **Display/Headlines**: `Inter` — clean, modern, highly legible. Weights: 600-800 for headlines.
- **Body**: `Inter` — weights 400-500. Line height 1.6 for readability.
- **Mono/Code**: `JetBrains Mono` — for any stats, numbers, or data displays.

### Spatial System

- Base unit: `4px`
- Spacing scale: `4, 8, 12, 16, 24, 32, 48, 64, 96px`
- Border radius: `8px` default, `12px` for cards, `16px` for modals
- Max content width: `640px` (focused, readable — like a newspaper column)

### Motion Philosophy

Motion should feel **natural and clarifying**, never decorative or attention-grabbing.

- **Entrance**: Subtle fade + gentle rise (translateY 8px → 0), 300ms ease-out. Stagger 50ms between elements.
- **State changes**: 150ms ease-out for hover/focus states. Fast enough to feel responsive.
- **Page transitions**: Cross-fade 200ms — calm, no dramatic slides.
- **Feedback animations**:
  - Correct: Brief scale pulse (1 → 1.02 → 1) + success color flash
  - Wrong: Gentle shake (3px horizontal oscillation, 300ms)
  - Reveal: Smooth expand/fade for explanation cards
- **Reduced motion**: Respect `prefers-reduced-motion`. Replace all motion with instant state changes.

### Component Patterns

- **Cards**: White/dark card with subtle shadow, `12px` radius, `24px` padding
- **Buttons**: Filled cyan accent for primary, ghost/outline for secondary. `8px` radius, `12px 20px` padding.
- **Claim cards**: Large, centered, generous whitespace. The claim text is the hero.
- **Vote buttons**: Two prominent buttons (Real/Fake), equal size, clear labeling
- **Progress indicator**: Minimal dot or fraction display (e.g., "3 of 10"), not a progress bar

### What NOT to Do

- ❌ No gradients on large surfaces
- ❌ No bouncy/playful animations — this is about truth, not games
- ❌ No heavy shadows or 3D effects
- ❌ No more than 2 typefaces
- ❌ No bright saturated colors except the cyan accent
