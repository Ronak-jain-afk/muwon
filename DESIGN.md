---
name: muwon
description: Dark, receding Windows music player — album art as the visual anchor
colors:
  primary: "oklch(0.60 0.22 30)"
  neutral-bg: "oklch(0.04 0 0)"
  neutral-surface: "oklch(0.10 0 0)"
  neutral-surface-container: "oklch(0.14 0 0)"
  neutral-surface-hover: "oklch(0.18 0 0)"
  neutral-border: "oklch(0.22 0 0)"
  text-primary: "oklch(0.95 0 0)"
  text-secondary: "oklch(0.60 0 0)"
  text-disabled: "oklch(0.35 0 0)"
typography:
  family: "Inter, system-ui, -apple-system, sans-serif"
  mono: "\"JetBrains Mono\", \"SF Mono\", monospace"
  scale:
    xs: 0.6875rem
    sm: 0.75rem
    base: 0.875rem
    lg: 1rem
    xl: 1.125rem
    "2xl": 1.5rem
    "3xl": 2rem
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
rounded:
  sm: 4px
  md: 8px
  lg: 16px
  pill: 9999px
---

# muwon Design System

## 1. Overview

**Creative North Star: "The Ambient Inkwell"**

muwon's visual system is designed to recede into a deep, distraction-free dark canvas. The interface acts as a physical frame — deep blacks and subtle greys create a void-like space where album artwork projects its colors onto the listening environment. The interface is felt, not seen.

This system is optimized for low-light environments, high contrast readability, and immediate recognition of playback controls. It rejects light mode, decorative glassmorphism, and administrative grid aesthetics.

**Key Characteristics:**
- **Recessive Canvas**: Dark greys and deep blacks minimize glare and keep focus on album art.
- **Ember Accents**: A warm crimson primary (#muwon red) used only for active states — progress bars, now-playing indicators, selected items.
- **Pill-Shaped Controls**: Interactive chips and buttons use pill shapes for a tactile feel.
- **Flat Layering**: Depth via color offsets, not shadows.

## 2. Color Strategy

**Strategy: Restrained.** The interface is a recessive frame. The album art is the color. Brand color covers ≤10% of any screen.

### Palette

| Role | Value | Usage |
|---|---|---|
| bg | oklch(0.04 0 0) | Base canvas — pure near-black |
| surface | oklch(0.10 0 0) | Player bar, sidebar, top nav |
| surface-container | oklch(0.14 0 0) | Cards, buttons, dialogs |
| surface-hover | oklch(0.18 0 0) | Hover states, active selections |
| border | oklch(0.22 0 0) | Dividers, subtle strokes |
| primary | oklch(0.60 0.22 30) | Warm crimson ember — active states only |
| primary-hover | oklch(0.55 0.22 30) | Primary hover |
| primary-glow | oklch(0.60 0.22 30 / 0.15) | Ambient glow behind active elements |
| accent | oklch(0.75 0.12 70) | Warm amber — badges, secondary accents |
| ink | oklch(0.95 0 0) | Primary text |
| ink-secondary | oklch(0.60 0 0) | Secondary text, inactive icons |
| ink-disabled | oklch(0.35 0 0) | Disabled states, placeholder text |

### Named Rules

**The Ten Percent Rule.** Primary covers ≤10% of any screen. Reserved for high-signal active states only.

**The Dark Canvas Doctrine.** No white or light backgrounds on any major container. Neutrals stay within L 0.04–0.22.

**The Ember Glow Rule.** Active elements (now-playing row, progress bar fill, selected sidebar item) use the warm crimson primary. The glow variant provides a subtle halo.

## 3. Typography

**Family:** Inter (single sans for everything — headings, body, labels, buttons)

**Scale (fixed rem, not fluid):**
| Token | Size | Weight | Usage |
|---|---|---|---|
| 3xl | 2rem (32px) | 700 | Now-playing track title |
| 2xl | 1.5rem (24px) | 700 | Section headings |
| xl | 1.125rem (18px) | 500 | Song titles in lists |
| base | 0.875rem (14px) | 400 | Body text, artist names |
| sm | 0.75rem (12px) | 500 | Labels, badges, tags |
| xs | 0.6875rem (11px) | 500 | Captions, timestamps |

**Rules:**
- `text-wrap: balance` on headings
- Body line length capped at 65ch
- All-caps limited to short labels (≤4 words) in tracking-wider
- System font stack fallback: `system-ui, -apple-system, sans-serif`

## 4. Elevation

No drop shadows. Depth through layering:
- Base: bg (L 0.04)
- Above: surface (L 0.10)
- Raised: surface-container (L 0.14)

The player bar sits at surface level with a border-top separator. Dialogs and popovers use surface-container with a thin border.

## 5. Component Styles

### Buttons
- **Icon buttons**: 32×32px circular, transparent bg → surface-hover on hover. No borders.
- **Play/Pause (primary)**: 36×36px circle, ink bg, bg text. Hover → ink-secondary.
- **Pill buttons**: `rounded-pill`, `px-4 py-2`. surface-container bg → surface-hover on hover. Used for "Import folder" and secondary CTAs.

### Range Sliders
- Track: 4px tall, border bg, rounded-full
- Thumb: 12px circle, ink bg, hidden until hover
- Used for: seek bar, volume

### Inputs
- Transparent bg, border (L 0.22), rounded-md
- Focus: border → ink-secondary with 150ms ease-out
- Placeholder: ink-disabled (L 0.35) — meets 4.5:1 contrast

### Song List
- Rows: grid `[40px 1fr 1fr auto]`, px-4 py-2
- Hover: surface-hover/30 bg
- Active: surface-hover/40 bg, primary text for title
- Index numbers hidden on hover, replaced by play icon
- Action buttons (heart, more) hidden until row hover

## 6. Layout

```
┌──────────────────────────────────────────────┐
│ TitleBar (36px, drag-region)                  │
├────────┬─────────────────────────────────────┤
│        │  SearchBar (px-6 py-4)              │
│ Sidebar│  ─────────────────────────────────  │
│ 260px  │  SongList (virtual, scroll)          │
│        │                                      │
├────────┴─────────────────────────────────────┤
│ PlayerBar (72px)                              │
│ [art][info]  [controls + seek]  [vol][extras] │
└──────────────────────────────────────────────┘
```

## 7. Accessibility

- All text meets WCAG 2.1 AA (body: ≥4.5:1, large: ≥3:1)
- `prefers-reduced-motion` fully respected
- Keyboard shortcuts (Space play/pause, ← → skip, ↑↓ volume, M mute, / search, R cycle repeat)
- Focus-visible outlines at 2px primary color
- Placeholder text at L 0.35 (≥4.5:1 against bg)
