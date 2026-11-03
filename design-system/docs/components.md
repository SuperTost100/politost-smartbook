# PoliTost Smartbook design system: components

The components live in the app: the reader frame in `src/components/shell/` and the pieces in `src/components/ds/`. Their styles are in `src/styles/ds.css`, where every class starts with `sb-`. The visual reference is `mockups/b-carta.html`.

Every component takes its colours from the tokens. A raised object uses `surface` with a `raised` shadow, a well uses `surface-raised` with a `pressed` shadow, and paper uses `page`.

## Frame

| Component | File | What it does |
| --- | --- | --- |
| `ReaderShell` | `shell/ReaderShell.tsx` | Sticky header, index panel, reading column and outline; the drawer and the bottom section bar below 1024px |
| `SectionTabs` | `shell/SectionTabs.tsx` | The book's sections as links in a pressed track, with the current one raised (`aria-current="page"`). `compact` shows icons only and keeps the label for screen readers and as a tooltip |
| `ChapterToc` | `shell/ChapterToc.tsx` | The chapters in an inset panel. The open chapter is raised and lists its paragraphs, with a ribbon dot on the current one |
| `ParagraphRail` | `shell/ParagraphRail.tsx` | A raised card with the chapter outline, the current paragraph pressed in, and a `Meter` |
| `Mark`, `Lockup` | `shell/Lockup.tsx` | The logo drawn inline, following the theme |
| `SiteHeader` | `SiteHeader.tsx` | The floating raised bar on pages outside the reader |
| `ThemeToggle` | `ThemeToggle.tsx` | A round raised icon button |

## Library

| Component | File | What it does |
| --- | --- | --- |
| `ResumePanel` | `ds/ResumePanel.tsx` | The newest reading position (`lastReadingPosition()`): cover with the ribbon, chapter title, where the student stopped, a `Meter` and two actions |
| `BookCard` | `ds/BookCard.tsx` | A raised tile with the cover, the title as the link (it covers the whole tile), the origin chip and, when there is one, the resume button |
| `BookCover` | `ds/BookCover.tsx` | A matte cover with page edges, subject, line drawing, title and author, scaled to its width with container units. Decorative: the title always appears again in text |
| `ImportDropzone` | `ds/ImportDropzone.tsx` | The dashed drop area inside the inset tray. The whole area is the button, so "Scegli il file" only looks like one |

The origin chip reads "Incluso nell’app", "Dal catalogo", "Dal tuo account" or "Importato qui". Licensed books get a second chip, "Richiede accesso".

## Reading

| Component | File | What it does |
| --- | --- | --- |
| `SmartbookView` | `SmartbookView.tsx` | The paper sheet (`.smartbook-view`) with the chapter, two sheets drawn under it |
| `SectionHeader`, `ChapterHeader` | `ds/SectionHeader.tsx`, `ds/ChapterHeader.tsx` | Kicker in `primary-text`, a `title-1` heading, facts and the print button, over a dashed rule |
| `ParagraphHeading` | `ds/ParagraphHeading.tsx` | A `title-2` heading with its number in a raised badge and a hover anchor |
| `Formula` | `ds/Formula.tsx` | An engraved plate (`code-bg`, inset shadow) with the number in a raised paper badge and the label below |
| `FormulaRef` | `ds/FormulaRef.tsx` | The number as a tinted chip that opens a preview popover on hover and focus |
| `Figure` | `ds/Figure.tsx` | The image on paper with a hairline, the caption below with its number in bold |
| `ChapterPager` | `ds/ChapterPager.tsx` | Previous and next chapter as two raised buttons |
| `Meter` | `ds/Meter.tsx` | A groove with the ribbon colour filled up to the value, `role="meter"` |

## Practice

| Component | File | What it does |
| --- | --- | --- |
| `ExerciseCard` | `ds/ExerciseCard.tsx` | A raised card: the id in the serif, the chapter, the difficulty, the question and the reveal buttons |
| `RevealBlock` | `ds/RevealBlock.tsx` | A raised button that opens a hint (`star-soft`) or a solution (`success-soft`) panel, which can be closed again. Focus moves to the button that replaces the one pressed |
| `DifficultyTag` | `ds/DifficultyTag.tsx` | A pressed chip with one to three bars and the word, so it reads in greyscale and print |
| `FormulaCard` | `ds/FormulaCard.tsx` | A chapter's formulas in a raised card, one row per formula, each linking back to the chapter |
| `CodeCell` | `ds/CodeCell.tsx` | The lab editor in a raised card, with the output under it. Run is the one primary button |
| `GraphPanel` | `ds/GraphPanel.tsx` | A raised card with the plot on paper and the legend below |

## Buttons

`.sb-btn` is a raised paper button, `.sb-btn-primary` the terracotta one, `.sb-btn-ghost` a flat one for quiet actions such as "Rimuovi" and "Nascondi". `.sb-btn-sm` is 38px tall and the default 46px. `.sb-icon-btn` is the round 42px icon button. Every button presses in (`pressed`) while it is held.

- Use one primary button per view: "Riprendi" on the library, "Esegui" in the lab.
- antd `Button` gets the same look from `ptsbTheme()`, so forms and modals match.
