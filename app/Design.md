---
version: alpha
name: 'Gumroad Design System'
description: "Gumroad's design system is a high-contrast, creator-economy marketplace built on a single custom typeface (ABC Favorit) with a bold display hierarchy, a distinctive hot-pink (#ff90e8) brand accent, and a flat offset-shadow elevation language. The palette is intentionally minimal. near-black, off-white, and a small set of semantic accent colors (yellow, red, orange, pink). with a dual light/dark theme that inverts the surface and text roles cleanly. Illustrations use 3D coin motifs in the brand pink. No box shadows are used on surfaces; depth is conveyed through solid 1px borders and the CSS offset-shadow utility."
colors:
  dark-panel: '#242423'
  orange: '#ffc900'
  pink-accent: '#ff90e8'
  red: '#dc341e'
  true-black: '#000000'
  yellow: '#f1f333'
  muted-text: '#dddddd'
  white: '#ffffff'
  off-white-surface: '#f4f4f0'
  black: '#000000'
typography:
  display-hero:
    fontFamily: 'ABC Favorit'
    fontSize: '96px'
    fontWeight: '400'
    lineHeight: '96px'
    letterSpacing: '-0.4px'
  display-xl:
    fontFamily: 'ABC Favorit'
    fontSize: '72px'
    fontWeight: '500'
    lineHeight: '72px'
    letterSpacing: '-0.4px'
  display-large:
    fontFamily: 'ABC Favorit'
    fontSize: '48px'
    fontWeight: '500'
    lineHeight: '48px'
    letterSpacing: '-0.4px'
  display-medium:
    fontFamily: 'ABC Favorit'
    fontSize: '48px'
    fontWeight: '400'
    lineHeight: '60px'
    letterSpacing: '-0.4px'
  heading-1:
    fontFamily: 'ABC Favorit'
    fontSize: '36px'
    fontWeight: '400'
    lineHeight: '40px'
    letterSpacing: '-0.4px'
  heading-2:
    fontFamily: 'ABC Favorit'
    fontSize: '24px'
    fontWeight: '500'
    lineHeight: '32px'
    letterSpacing: '-0.4px'
  heading-3:
    fontFamily: 'ABC Favorit'
    fontSize: '24px'
    fontWeight: '400'
    lineHeight: '32px'
    letterSpacing: '-0.4px'
  body-large:
    fontFamily: 'ABC Favorit'
    fontSize: '20px'
    fontWeight: '400'
    lineHeight: '28px'
    letterSpacing: '-0.4px'
  body-medium:
    fontFamily: 'ABC Favorit'
    fontSize: '18px'
    fontWeight: '400'
    lineHeight: '28px'
    letterSpacing: '-0.4px'
  body-base:
    fontFamily: 'ABC Favorit'
    fontSize: '16px'
    fontWeight: '400'
    lineHeight: '26px'
    letterSpacing: '-0.4px'
  label-medium:
    fontFamily: 'ABC Favorit'
    fontSize: '20px'
    fontWeight: '500'
    lineHeight: '28px'
    letterSpacing: '-0.4px'
  label-small:
    fontFamily: 'ABC Favorit'
    fontSize: '14px'
    fontWeight: '400'
    lineHeight: '20px'
    letterSpacing: '-0.4px'
rounded:
  radius-sm: '4px'
  radius-md: '6px'
  radius-lg: '16px'
  radius-xl: '24px'
  radius-pill: '10rem'
spacing:
  space-1: '4px'
  space-2: '8px'
  space-3: '12px'
  space-4: '16px'
  space-5: '24px'
  space-6: '32px'
  space-7: '40px'
  space-8: '48px'
  space-9: '56px'
  space-10: '64px'
  space-11: '80px'
  space-12: '96px'
  space-13: '128px'
  space-14: '160px'
  space-15: '224px'
---

## Overview

Gumroad's design system is a high-contrast, creator-economy marketplace built on a single custom typeface (ABC Favorit) with a bold display hierarchy, a distinctive hot-pink (#ff90e8) brand accent, and a flat offset-shadow elevation language. The palette is intentionally minimal. near-black, off-white, and a small set of semantic accent colors (yellow, red, orange, pink). with a dual light/dark theme that inverts the surface and text roles cleanly. Illustrations use 3D coin motifs in the brand pink. No box shadows are used on surfaces; depth is conveyed through solid 1px borders and the CSS offset-shadow utility.

**Signature traits:**

- Single-family weight hierarchy: Builds hierarchy from ABC Favorit across 3 weights rather than multiple families.
- Soft, rounded geometry: Generous corner rounding up to 160px.

## Colors

The palette uses 16 validated color tokens across 2 theme profiles. Semantic roles stay attached to observed usage so generation agents can choose accents without inventing new color meaning.

**Semantic naming:**

- **border-text** maps to `black`: Role "text" is grounded by usage context "Primary body text, headings, borders, and icon fills across the entire page".
- **surface-background** maps to `off-white-surface`: Role "background" is grounded by usage context "Page background and section fills in light mode".
- **action-background** maps to `dark-panel`: Role "background" is grounded by usage context "Button backgrounds, input backgrounds, nav active states, and dark-panel surfaces in light mode".
- **action-primary** maps to `white`: Role "primary" is grounded by usage context "Button text, card surfaces, and inverted text on dark panels".

### Dark Theme

### Primary Brand

- **Dark Panel** (#242423): Card surfaces, input backgrounds, and nav panel fills in dark mode. Role: primary. {authored: rgb(36, 36, 35), space: rgb}

### Text Scale

- **Muted Text** (#dddddd): Secondary text and muted foreground elements in dark mode. Role: text. {authored: rgb(221, 221, 221), space: rgb}
- **White** (#ffffff): Primary body text, headings, and icon fills in dark mode. Role: text. {authored: rgb(255, 255, 255), space: rgb}

### Surface & Shadows

- **Orange** (#ffc900): Warning semantic color in dark mode. Role: background. {authored: rgb(255, 201, 0), space: rgb}
- **Pink Accent** (#ff90e8): Brand coin illustrations and accent highlights in dark mode. Role: background. {authored: rgb(255, 144, 232), space: rgb}
- **Red** (#dc341e): Danger/error semantic color in dark mode. Role: background. {authored: rgb(220, 52, 30), space: rgb}
- **True Black** (#000000): Page background in dark mode. Role: background. {authored: rgb(0, 0, 0), space: rgb, alpha: 0.35}
- **Yellow** (#f1f333): Semantic accent color for highlights in dark mode. Role: background. {authored: rgb(241, 243, 51), space: rgb}

### Light Theme

### Primary Brand

- **White** (#ffffff): Button text, card surfaces, and inverted text on dark panels. Role: primary. {authored: rgb(255, 255, 255), space: rgb}

### Text Scale

- **Black** (#000000): Primary body text, headings, borders, and icon fills across the entire page. Role: text. {authored: rgb(0, 0, 0), space: rgb}

### Surface & Shadows

- **Dark Panel** (#242423): Button backgrounds, input backgrounds, nav active states, and dark-panel surfaces in light mode. Role: background. {authored: rgb(36, 36, 35), space: rgb}
- **Off-White Surface** (#f4f4f0): Page background and section fills in light mode. Role: background. {authored: rgb(244, 244, 240), space: rgb}
- **Orange** (#ffc900): Warning semantic color. Role: background. {authored: rgb(255, 201, 0), space: rgb}
- **Pink Accent** (#ff90e8): Brand coin illustrations, CTA button fill (Start selling), and accent highlights. Role: background. {authored: rgb(255, 144, 232), space: rgb}
- **Red** (#dc341e): Danger/error semantic color. Role: background. {authored: rgb(220, 52, 30), space: rgb}
- **Yellow** (#f1f333): Semantic accent color for highlights and badge surfaces. Role: background. {authored: rgb(241, 243, 51), space: rgb}

## Typography

Typography uses ABC Favorit across extracted hierarchy roles. Keep hierarchy mapped to these token rows before adding decorative type styles.

Uses ABC Favorit throughout for a uniform feel. Weight range spans regular, medium, bold. Sizes range from 14px to 96px.

### Font Roles

- **Headline Font**: ABC Favorit
- **Body Font**: ABC Favorit

### Type Scale Evidence

| Role                                               | Font        | Size | Weight | Line Height | Letter Spacing | Stack / Features                      | Notes           |
| -------------------------------------------------- | ----------- | ---- | ------ | ----------- | -------------- | ------------------------------------- | --------------- |
| Largest hero display text (e.g. 'Go from 0 to $1') | ABC Favorit | 96px | 400    | 96px        | -0.4px         | ABC Favorit; features: "ss04", "ss11" | Extracted token |
| Section display headings                           | ABC Favorit | 72px | 500    | 72px        | -0.4px         | ABC Favorit; features: "ss04", "ss11" | Extracted token |
| Feature section headings                           | ABC Favorit | 48px | 500    | 48px        | -0.4px         | ABC Favorit; features: "ss04", "ss11" | Extracted token |
| Secondary display headings                         | ABC Favorit | 48px | 400    | 60px        | -0.4px         | ABC Favorit; features: "ss04", "ss11" | Extracted token |
| Section headings                                   | ABC Favorit | 36px | 400    | 40px        | -0.4px         | ABC Favorit; features: "ss04", "ss11" | Extracted token |
| Card headings and sub-section titles               | ABC Favorit | 24px | 500    | 32px        | -0.4px         | ABC Favorit; features: "ss04", "ss11" | Extracted token |
| Tertiary headings                                  | ABC Favorit | 24px | 400    | 32px        | -0.4px         | ABC Favorit; features: "ss04", "ss11" | Extracted token |
| Hero subheading and lead paragraph text            | ABC Favorit | 20px | 400    | 28px        | -0.4px         | ABC Favorit; features: "ss04", "ss11" | Extracted token |
| Secondary body text                                | ABC Favorit | 18px | 400    | 28px        | -0.4px         | ABC Favorit; features: "ss04", "ss11" | Extracted token |
| Default body text, nav links, and general UI text  | ABC Favorit | 16px | 400    | 26px        | -0.4px         | ABC Favorit; features: "ss04", "ss11" | Extracted token |
| Button labels and emphasized UI labels             | ABC Favorit | 20px | 500    | 28px        | -0.4px         | ABC Favorit; features: "ss04", "ss11" | Extracted token |
| Small labels, captions, and metadata               | ABC Favorit | 14px | 400    | 20px        | -0.4px         | ABC Favorit; features: "ss04", "ss11" | Extracted token |

## Layout

Responsive system uses 2 breakpoint tier(s): desktop, wide.

This system uses a 8px base grid with scale values 4, 8, 12, 16, 24, 32, 40, 48, 56, 64, 80, 96, 128, 160, 224.

### Responsive Strategy

- **desktop (Unknown)**: Expand layout density and horizontal composition for wide viewports.
- **wide (>= 2000px)**: Stretch composition with generous gutters and wider layout spans.

### Spacing System

| Token    | Value | Px  | Notes                   |
| -------- | ----- | --- | ----------------------- |
| space-1  | 4px   | 4   | Extracted spacing token |
| space-2  | 8px   | 8   | Extracted spacing token |
| space-3  | 12px  | 12  | Extracted spacing token |
| space-4  | 16px  | 16  | Extracted spacing token |
| space-5  | 24px  | 24  | Extracted spacing token |
| space-6  | 32px  | 32  | Extracted spacing token |
| space-7  | 40px  | 40  | Extracted spacing token |
| space-8  | 48px  | 48  | Extracted spacing token |
| space-9  | 56px  | 56  | Extracted spacing token |
| space-10 | 64px  | 64  | Extracted spacing token |
| space-11 | 80px  | 80  | Extracted spacing token |
| space-12 | 96px  | 96  | Extracted spacing token |
| space-13 | 128px | 128 | Extracted spacing token |
| space-14 | 160px | 160 | Extracted spacing token |
| space-15 | 224px | 224 | Extracted spacing token |

## Elevation & Depth

Keep depth flat unless validated shadow or interaction evidence appears in the extraction payload. Do not invent shadows beyond this evidence boundary.

### Shadow Evidence

| Shadow Token | Layers | Details                     |
| ------------ | ------ | --------------------------- |
| n/a          | 0      | No validated shadow payload |

### Interaction Signals

| Theme | Signal         | Evidence                                                                                 |
| ----- | -------------- | ---------------------------------------------------------------------------------------- |
| Light | outline-color  | rgb(0, 0, 0) ; rgb(255, 255, 255) ; oklab(0.259939 -0.000510752 0.00176638 / 0.5)        |
| Light | outline-width  | 3px                                                                                      |
| Light | outline-offset | 0px                                                                                      |
| Light | transform      | matrix(1, 0, 0, 1, 0, 0) ; matrix(1, 0, 0, 1, -105.24, 0) ; matrix(1, 0, 0, 1, 0, -388)  |
| Dark  | outline-color  | rgb(255, 255, 255) ; rgb(0, 0, 0) ; oklab(0.999994 0.0000455677 0.0000200868 / 0.7)      |
| Dark  | outline-width  | 3px                                                                                      |
| Dark  | outline-offset | 0px                                                                                      |
| Dark  | transform      | matrix(1, 0, 0, 1, 0, 0) ; matrix(1, 0, 0, 1, -122.307, 0) ; matrix(1, 0, 0, 1, 0, -388) |

## Shapes

Shape language maps directly to rounded tokens. Keep component corners consistent with the role mapping below before introducing bespoke geometry.

### Radius Roles

| Token       | Value | Px  | Role Mapping         |
| ----------- | ----- | --- | -------------------- |
| radius-sm   | 4px   | 4   | Subtle corner        |
| radius-md   | 6px   | 6   | Subtle corner        |
| radius-lg   | 16px  | 16  | Card corner          |
| radius-xl   | 24px  | 24  | Large surface corner |
| radius-pill | 10rem | 160 | Large surface corner |

### Geometry Evidence

| Radius Token | Shape | Units |
| ------------ | ----- | ----- |
| radius-sm    | 4px   | px    |
| radius-md    | 6px   | px    |
| radius-lg    | 16px  | px    |
| radius-xl    | 24px  | px    |
| radius-pill  | 10rem | rem   |

## Components

(none detected)

## Do's and Don'ts

Guardrails protect Single-family weight hierarchy, Soft, rounded geometry without adding unsupported visual claims.

| Do                                                                            | Don't                                                      |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Do maintain consistent spacing using the base grid                            | Don't make unsupported claims about absent visual features |
| Do maintain WCAG AA contrast ratios (4.5:1 for normal text)                   | Don't mix rounded and sharp corners in the same view       |
| Do use the primary color only for the single most important action per screen |                                                            |
| Do verify evidence before writing new design-system guidance                  |                                                            |

## Responsive Evidence

### Breakpoints

| Name         | Width     | Key Changes             |
| ------------ | --------- | ----------------------- |
| Desktop      | >= 2000px | (min-width: 2000px)     |
| Breakpoint 2 | Unknown   | (forced-colors: active) |

## Agent Prompt Guide

### Example Component Prompts

- Create button component using validated primary color role and spacing tokens.
- Create card component with mapped radius role and evidence-backed elevation.
- Create form input component using inferred typography hierarchy and border roles.

### Iteration Guide

1. Start with extracted palette and typography roles only.
2. Map spacing and radius directly from token tables before visual polish.
3. Apply component patterns one section at a time and compare against source intent.
4. Keep elevation claims tied to explicit evidence in output.
5. Iterate with smallest diffs and re-check section hierarchy after each change.
