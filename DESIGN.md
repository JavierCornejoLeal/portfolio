# Design

Design tokens for the portfolio. Source of truth in code: `src/styles/global.css` (`@theme` block, Tailwind v4).

## Typography

| Role    | Family                         | Token            | Use                                         |
| ------- | ------------------------------ | ---------------- | ------------------------------------------- |
| Poster  | Anton                          | `--font-poster`  | Monumental condensed display headlines      |
| Display | Unbounded Variable             | `--font-display` | Uppercase labels and survey legends         |
| Sans    | DM Sans Variable               | `--font-sans`    | Reading text (body default)                 |

Fallbacks: Anton → Unbounded → sans-serif. Anton loads from `@fontsource/anton`; Unbounded and DM Sans from `@fontsource-variable`.

**Legend style** (`.legend`): Unbounded, `0.6875rem`, weight 500, `letter-spacing: 0.18em`, uppercase.

## Color

Survey ground: near-black with a faint green cast, never pure black. Dark scheme only.

### Neutrals

| Token                  | Value     | Use                      |
| ---------------------- | --------- | ------------------------ |
| `--color-ground`       | `#070907` | Page background          |
| `--color-ground-raised`| `#0d110c` | Raised surfaces          |
| `--color-rule`         | `#1c2619` | Rules, borders           |
| `--color-ink`          | `#e9efe6` | Primary text             |
| `--color-ink-muted`    | `#9aa894` | Secondary text           |

### Accent: Harlequin

| Step | Value     |
| ---- | --------- |
| 50   | `#ecffe4` |
| 100  | `#d4ffc4` |
| 200  | `#abff90` |
| 300  | `#78ff50` |
| 400  | `#5bff2e` |
| 500  | `#2ee600` |
| 600  | `#21b800` |
| 700  | `#178b00` |
| 800  | `#176d07` |
| 900  | `#165c0b` |
| 950  | `#063400` |

Token pattern: `--color-harlequin-<step>`.

### Applied

- Selection: background `harlequin-500`, text `ground`.
- Focus ring: `2px solid harlequin-400`, offset `4px`.
- Caret: `harlequin-400`. Scrollbar: `harlequin-800` on `ground`.
- `theme-color` meta: `#070907`.

## Motion

| Token            | Value                            |
| ---------------- | -------------------------------- |
| `--ease-curtain` | `cubic-bezier(0.16, 1, 0.3, 1)`  |
| `--ease-survey`  | `cubic-bezier(0.65, 0, 0.35, 1)` |

All motion respects `prefers-reduced-motion`.

## Lines

Line states are drawn by stroke pattern, not hue: `.rail` (1px solid), `.rail-dashed`, `.rail-double` (4px double).
