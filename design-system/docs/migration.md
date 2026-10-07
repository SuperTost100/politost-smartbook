# Migrating the current reader

What changes in `politost-smartbook-main` when the system goes in. Do it in this order; each step ships on its own.

## 1. Tokens and fonts

Import `design-system/tokens/tokens.css` first in `main.tsx`, then map the old variables in `src/styles/global.css` onto the new tokens, so the whole app switches at once before any markup changes:

| Old variable | New token |
| --- | --- |
| `--color-bg` | `--bg` (chrome) / `--page` (reading column) |
| `--color-surface`, `--color-surface-elevated` | `--surface`, `--surface-overlay` |
| `--color-border` | `--border` (controls: `--border-control`) |
| `--color-text` | `--ink` |
| `--color-muted` | `--ink-muted` |
| `--color-primary`, `--color-primary-hover` | `--primary`, `--primary-hover` (as text: `--primary-text`) |
| `--color-primary-light` | `--primary-soft` |
| `--color-accent` (orange) | removed: gold `--star` for position, nothing else |
| `--color-hint`, `--color-hint-border` | `--star-soft` (no border) |
| `--color-solution`, `--color-solution-border` | `--info-soft` (no border) |
| `--color-danger*` | `--danger`, `--danger-soft` |
| `--badge-uploaded-*`, `--badge-licensed-*` | `Tag` tones `uploaded`, `licensed` |
| `--radius-sm`, `--radius`, `--radius-lg` | `--radius-sm`, `--radius-md`, `--radius-lg` (same values) |
| `--shadow-*`, `--shadow-primary` | `--shadow-card`, `--shadow-overlay`; drop the coloured shadow |
| `--font-sans` (Inter), `--font-serif` (Georgia) | `--font-sans` (Figtree), `--font-serif` (Source Serif 4), `--font-mono` |
| `--header-gradient` | removed: `--bg` flat |
| `--transition-spring` | removed: no bounce |

Also: remove the `.book-card-accent--*` subject colours and the hard-coded `.difficulty-*` dark colours; `DifficultyTag` replaces them. `[data-theme]` stays on `<html>`; default to the system setting, light when unknown.

## 2. Logo and favicons

Replace `public/logo.svg`, `favicon.svg`, `favicon-*.png`, `apple-touch-icon.png` with the files in `logo/` (`ptsb-app-icon-small.svg` for the favicon, the PNGs for the rest). The header uses the lockup, not "Politost / Smartbook" text.

## 3. Shell

Swap `Layout.tsx` (header + `SectionNav` + `ChapterIndex`) for `ReaderShell`. `SectionNav` becomes the `Segmented`; `ChapterIndex` becomes the ProLayout menu; `ParagraphNav` (numbered buttons) becomes the `Anchor` rail. `useAppChromeHeight` can go: the header is a fixed 64px.

## 4. Reading components

- `SmartbookView` toolbar → `ChapterHeader`; paragraph `h3.paragraph-title` → `ParagraphHeading` (an `h2`); add `ChapterPager` at the end.
- `ContentFlow` output gets the `sb-prose` class; numbered formulas → `Formula`; `FormulaTooltip` → `FormulaRef` (opens on focus too); `SmartbookFigure` → `Figure`.
- `RevealBlock`, `EserciziView`, `FormularioView`, `IdeView`, `GraficiView` → `RevealBlock`, `ExerciseCard`, `FormulaCard`, `CodeCell`, `GraphPanel`.
- Home: `book-card` → `BookCard`, `upload-dropzone` → `ImportDropzone`.

## 5. Print

`print.css` and Paged.js keep their own page layout. Use `ptsb-mark-mono.svg`, `--font-serif` for text, show hints and solutions open, and no background fills.
