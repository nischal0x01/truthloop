# 07 — Design Tokens (Gumroad → Tailwind v4)

> Maps the Gumroad design system (extracted in `app/Design.md`) into concrete Tailwind v4 config, CSS variables, and component recipes the engineering team uses directly.

---

## 1. Token inventory

Source: [app/Design.md](../app/Design.md) — 16 color tokens, 12 type scale roles, 15 spacing values, 5 radius values.

---

## 2. Tailwind v4 configuration

Tailwind v4 uses CSS-first config (in `app/src/index.css`) — no more `tailwind.config.js`. Here is the exact file content:

```css
/* app/src/index.css */
@import "tailwindcss";
@import "tw-animate-css";  /* if shadcn needs it */

@theme {
  /* === Brand colors (semantic names) === */
  --color-background: #f4f4f0;          /* off-white-surface */
  --color-foreground: #000000;          /* black (primary text) */
  --color-card: #ffffff;                /* white (raised surfaces) */
  --color-card-foreground: #000000;

  --color-muted: #dddddd;               /* muted-text */
  --color-muted-foreground: #242423;    /* dark-panel as muted text */

  --color-accent: #ff90e8;              /* pink-accent (primary CTA) */
  --color-accent-foreground: #000000;

  --color-warning: #ffc900;             /* orange (warning) */
  --color-warning-foreground: #000000;

  --color-danger: #dc341e;              /* red (error / fake) */
  --color-danger-foreground: #ffffff;

  --color-highlight: #f1f333;           /* yellow (badges) */
  --color-highlight-foreground: #000000;

  --color-panel: #242423;               /* dark-panel (button bg, dark cards) */
  --color-panel-foreground: #ffffff;

  --color-border: #000000;              /* 1px borders are black */
  --color-input: #ffffff;
  --color-ring: #000000;

  /* === Type scale (ABC Favorit) === */
  --font-display: "ABC Favorit", "Inter", system-ui, sans-serif;
  --font-sans: "ABC Favorit", "Inter", system-ui, sans-serif;

  --text-display-hero: 96px;
  --text-display-xl: 72px;
  --text-display-large: 48px;
  --text-display-medium: 48px;
  --text-heading-1: 36px;
  --text-heading-2: 24px;
  --text-heading-3: 24px;
  --text-body-large: 20px;
  --text-body-medium: 18px;
  --text-body: 16px;
  --text-label: 20px;
  --text-label-small: 14px;

  --leading-display-hero: 96px;
  --leading-display-xl: 72px;
  --leading-display-large: 48px;
  --leading-display-medium: 60px;
  --leading-heading-1: 40px;
  --leading-heading-2: 32px;
  --leading-heading-3: 32px;
  --leading-body-large: 28px;
  --leading-body-medium: 28px;
  --leading-body: 26px;
  --leading-label: 28px;
  --leading-label-small: 20px;

  --tracking-display: -0.4px;
  --tracking-body: -0.4px;

  /* === Spacing (8px base) === */
  --spacing-1: 4px;
  --spacing-2: 8px;
  --spacing-3: 12px;
  --spacing-4: 16px;
  --spacing-5: 24px;
  --spacing-6: 32px;
  --spacing-7: 40px;
  --spacing-8: 48px;
  --spacing-9: 56px;
  --spacing-10: 64px;
  --spacing-11: 80px;
  --spacing-12: 96px;
  --spacing-13: 128px;
  --spacing-14: 160px;
  --spacing-15: 224px;

  /* === Radius === */
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 16px;
  --radius-xl: 24px;
  --radius-pill: 160px;
}

/* === Custom utilities === */
@layer utilities {
  /* The signature offset-shadow (no box-shadows elsewhere) */
  .shadow-hard-sm { box-shadow: 4px 4px 0 0 #000; }
  .shadow-hard    { box-shadow: 6px 6px 0 0 #000; }
  .shadow-hard-lg { box-shadow: 8px 8px 0 0 #000; }

  /* Focus ring (3px outline) */
  .focus-hard {
    outline: 3px solid #000;
    outline-offset: 0;
  }

  /* Hover-lift: bumps the offset shadow on hover (signature Gumroad interaction) */
  .hover-lift {
    transition: transform 120ms ease-out, box-shadow 120ms ease-out;
  }
  .hover-lift:hover {
    transform: translate(-2px, -2px);
    box-shadow: 8px 8px 0 0 #000;
  }
  .hover-lift:active {
    transform: translate(0, 0);
    box-shadow: 4px 4px 0 0 #000;
  }
}

/* === Global resets === */
@layer base {
  * {
    border-color: var(--color-border);
  }
  body {
    background: var(--color-background);
    color: var(--color-foreground);
    font-family: var(--font-sans);
    font-feature-settings: "ss04", "ss11";  /* Gumroad's ABC Favorit features */
  }
}
```

---

## 3. Font setup

ABC Favorit is a paid font. For the hackathon:

1. **Ideal**: license ABC Favorit and self-host from `app/public/fonts/`
2. **Acceptable**: use the **free ABC Diatype Mono / Inter** as a fallback (already in the @theme stack)
3. **Last resort**: use Inter (free, available via `npm i @fontsource/inter`)

```ts
// app/src/main.tsx
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
// Optional: import ABC Favorit if licensed
// import "./fonts/abc-favorit.css";
```

---

## 4. Component recipes

### 4.1 Button (the workhorse)

```tsx
// app/src/components/ui/button.tsx
import { cva, type VariantProps } from "class-variance-authority";

const button = cva(
  "inline-flex items-center justify-center font-label font-medium border-2 border-black " +
    "rounded-lg transition-transform active:translate-x-[2px] active:translate-y-[2px] " +
    "focus-hard disabled:opacity-50 disabled:cursor-not-allowed",
  {
    variants: {
      variant: {
        primary: "bg-accent text-accent-foreground shadow-hard hover-lift",
        dark:    "bg-panel text-panel-foreground shadow-hard hover-lift",
        ghost:   "bg-transparent text-foreground hover:bg-muted",
        danger:  "bg-danger text-danger-foreground shadow-hard hover-lift",
        highlight: "bg-highlight text-highlight-foreground shadow-hard hover-lift",
      },
      size: {
        sm: "h-9 px-3 text-label-small",
        md: "h-11 px-5 text-label",
        lg: "h-14 px-7 text-body-large",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);
```

### 4.2 Card

```tsx
// app/src/components/ui/card.tsx
<div className="bg-card border-2 border-black rounded-lg p-6 shadow-hard">
  {children}
</div>
```

### 4.3 Claim card (specific to this app)

```tsx
// app/src/components/ClaimCard.tsx
<article className="bg-card border-2 border-black rounded-lg p-6 shadow-hard hover-lift cursor-pointer">
  <div className="flex items-center gap-2 mb-3">
    <span className="text-label-small text-muted-foreground uppercase tracking-wider">
      {category}
    </span>
    <span className="text-muted-foreground">·</span>
    <span className="text-label-small text-muted-foreground">
      {timeAgo(publishedAt)}
    </span>
  </div>
  <h3 className="text-heading-2 leading-heading-2 mb-4 line-clamp-3">
    {text}
  </h3>
  <div className="flex items-center justify-between text-label-small">
    <span className="text-muted-foreground">{voteCount} votes</span>
    <span className="text-accent font-medium">Vote →</span>
  </div>
</article>
```

### 4.4 Vote buttons (Real / Fake)

```tsx
// app/src/components/VoteButtons.tsx
<div className="grid grid-cols-2 gap-4">
  <button
    disabled={!!userVote}
    className={cn(
      "h-16 rounded-lg border-2 border-black text-heading-3 font-medium",
      "transition-all active:translate-x-[2px] active:translate-y-[2px]",
      "focus-hard shadow-hard hover-lift",
      userVote === "real"
        ? "bg-highlight text-highlight-foreground"
        : "bg-card text-foreground"
    )}
  >
    ✓ Real
  </button>
  <button
    disabled={!!userVote}
    className={cn(
      "h-16 rounded-lg border-2 border-black text-heading-3 font-medium",
      "transition-all active:translate-x-[2px] active:translate-y-[2px]",
      "focus-hard shadow-hard hover-lift",
      userVote === "fake"
        ? "bg-danger text-danger-foreground"
        : "bg-card text-foreground"
    )}
  >
    ✕ Fake
  </button>
</div>
```

### 4.5 Scam forecast severity card

```tsx
// app/src/components/ScamForecastCard.tsx
<article
  className={cn(
    "border-2 border-black rounded-lg p-5 shadow-hard",
    severity === "high"   && "bg-danger text-danger-foreground",
    severity === "medium" && "bg-warning text-warning-foreground",
    severity === "low"    && "bg-card text-foreground",
  )}
>
  <div className="flex items-center gap-2 mb-2">
    <SeverityBadge severity={severity} />
    <span className="text-label-small uppercase">{category}</span>
  </div>
  <h3 className="text-heading-3 mb-2">{title}</h3>
  <p className="text-body mb-4">{description}</p>
  <div className="flex gap-2">
    <button className="h-9 px-4 bg-card text-foreground border-2 border-black rounded-md text-label-small font-medium">
      I believe this
    </button>
    <button className="h-9 px-4 bg-panel text-panel-foreground border-2 border-black rounded-md text-label-small font-medium">
      Don't buy it
    </button>
  </div>
</article>
```

### 4.6 Comment

```tsx
// app/src/components/Comment.tsx
<article className={cn("border-l-2 border-black pl-4", depth > 0 && "ml-6")}>
  <header className="flex items-center gap-2 mb-2">
    <Avatar src={comment.user.avatar_url} size="sm" />
    <span className="text-label-small font-medium">{comment.user.display_name}</span>
    <span className="text-muted-foreground text-label-small">· {timeAgo(comment.created_at)}</span>
    {comment.is_flagged && <FlagBadge />}
  </header>
  <p className="text-body mb-2">{comment.body}</p>
  <footer className="flex items-center gap-3 text-label-small text-muted-foreground">
    <button>↑ {comment.upvotes}</button>
    <button>↓ {comment.downvotes}</button>
    <button>Reply</button>
  </footer>
</article>
```

### 4.7 Top nav

```tsx
// app/src/components/TopNav.tsx
<header className="sticky top-0 z-50 bg-background border-b-2 border-black">
  <div className="max-w-7xl mx-auto flex items-center justify-between h-16 px-6">
    <Link to="/" className="text-heading-3 font-medium tracking-display">
      TruthLoop
    </Link>
    <nav className="hidden md:flex items-center gap-6 text-body">
      <Link to="/">Claims</Link>
      <Link to="/forecast">Forecast</Link>
      <Link to="/leaderboard">Leaderboard</Link>
    </nav>
    <div className="flex items-center gap-4">
      <CoinDisplay value={user.points} />
      <Bell unreadCount={unreadCount} />
      <Avatar src={user.avatar_url} />
    </div>
  </div>
</header>
```

---

## 5. Page-level layout

```tsx
// app/src/components/Layout.tsx
<main className="max-w-7xl mx-auto px-6 py-12">
  {children}
</main>
```

Section spacing:
- Hero/landing: `py-24` (96px, space-12)
- Section: `py-16` (64px, space-10)
- Card grid: `gap-6` (24px, space-5)
- Within card: `p-6` (24px, space-5)

---

## 6. Semantic color usage (where each color is used)

| Token | Used for |
| --- | --- |
| `background` (off-white) | Page bg |
| `foreground` (black) | Primary text, borders, icon fills |
| `accent` (hot-pink) | Primary CTA buttons, brand highlights, "Vote" arrows |
| `panel` (dark) | Dark CTA buttons, nav active state, dark surface variations |
| `card` (white) | Raised card surfaces, input fields |
| `muted` (light gray) | Secondary text on dark, disabled states |
| `danger` (red) | "Fake" verdict, errors, delete actions, high-severity scams |
| `warning` (orange) | "Flagged" comments, medium-severity scams |
| `highlight` (yellow) | Correct guess, badges, "Real" verdict, low-severity scams |

---

## 7. Don'ts (guardrails from `app/Design.md`)

- ❌ Don't use `box-shadow` anywhere except via `.shadow-hard*` utilities (the offset shadow is the design language)
- ❌ Don't mix rounded and sharp corners in the same view
- ❌ Don't use the accent color for more than one action per screen
- ❌ Don't introduce new colors — pull from the token list
- ❌ Don't use the muted gray for primary text (4.5:1 contrast fails on off-white)
- ❌ Don't add decorative type styles — stick to the 12-role scale
- ❌ Don't use gradients (not in the source)
- ❌ Don't add box-shadows on cards (use border + offset shadow)

---

## 8. Animation recipe (micro-interactions)

```tsx
// Coin bounce on points gain
<motion.div
  key={points}  // re-mount on change
  initial={{ y: 0, scale: 1 }}
  animate={{ y: [-20, 0], scale: [1.3, 1] }}
  transition={{ duration: 0.4, ease: "easeOut" }}
>
  <Coin />
</motion.div>

// Badge toast (slides in from top)
<AnimatePresence>
  {showBadge && (
    <motion.div
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -100, opacity: 0 }}
      className="fixed top-20 right-6 bg-highlight border-2 border-black rounded-lg p-4 shadow-hard"
    >
      <div className="text-3xl">{badge.icon}</div>
      <div className="text-label-small font-medium">Badge earned: {badge.name}</div>
    </motion.div>
  )}
</AnimatePresence>

// SSE-triggered live comment (highlights briefly)
<motion.article
  initial={{ backgroundColor: "#f1f333" }}
  animate={{ backgroundColor: "transparent" }}
  transition={{ duration: 1.5 }}
>
  ...
</motion.article>
```

---

## 9. Quick-start for the team

1. Copy `app/src/index.css` from §2 above (replaces the default)
2. Install Inter via `npm i @fontsource/inter` (free, drop-in)
3. Use the recipes in §4 for the main components
4. Reference §6 for which color goes where
5. When in doubt, look at gumroad.com — that's the source
