# Print Preview

The printer icon in the reader's top bar (**Versione stampabile**, or Ctrl+P / Cmd+P) opens the preview of the page on screen: the chapter, the formula sheet, the exercises or the exam questions. From a chapter, the options panel can switch the preview to the whole book. Page headers have no print button.

## Routes

| Content | URL |
|---------|-----|
| Chapter | `/libro/<id>/stampa/capitolo/<chapter-id>` |
| Whole book | `/libro/<id>/stampa/libro` |
| Formulario | `/libro/<id>/stampa/formulario` |
| Exercises | `/libro/<id>/stampa/esercizi` |
| Exams | `/libro/<id>/stampa/esami` |

Requires `printable: true` on the chapter or exercise frontmatter. The whole book leaves out the chapters with `printable: false`.

The formula sheet, exercise and exam routes take the filters of the page they were opened from, so the printout matches the screen:

| Parameter | Values | Applies to |
|-----------|--------|------------|
| `capitolo` | a chapter number, `tutti`, or `altri` (exercises without a chapter) | `esercizi` |
| `capitolo` | a chapter number or `tutte`; `tutte` prints the chapters that have formulas | `formulario` |
| `difficolta` | `facile`, `medio`, `difficile` | `esercizi`, `esami` |

The document title, the running head and the saved PDF's name include them, for example `Esercizi · Capitolo 3. Formule e nomenclatura inorganica · Livello difficile`. A missing or unknown value prints everything (for the formula sheet, every chapter with formulas; a book without the formula index prints every chapter).

## Options

The panel sits left of the sheet from 1024px and opens from **Opzioni** in the toolbar below that, as a bottom sheet (below 400px the button shows only its icon). Every option lives in the URL, so a reload, a shared link and **Torna al libro** keep it. Defaults are left out of the URL, and a missing or invalid value falls back to the default. The parsing, the exercise picks and the remembered options are in `src/lib/printOptions.ts`.

| Parameter | Values | Default | Applies to |
|-----------|--------|---------|------------|
| `capitoli` | chapter numbers, comma separated; empty for none | every printable chapter | `libro` |
| `esercizi` | `tutti`, `3`, `5`, `10` | off | `capitolo`, `libro` |
| `formulario` | `1` | off | `libro` |
| `esami` | `1` | off | `libro` |
| `soluzioni` | `0` | on | `capitolo`, `libro`, `esercizi`, `esami` |
| `da` | a chapter id | none | `libro` |

- **Cosa stampare** switches between **Questo capitolo** and **Tutto il libro**. The whole book remembers the chapter it came from in `da`, so **Questo capitolo** goes back to it; both keep `esercizi`, `soluzioni` and `return`.
- **Esercizi** with a limit picks the same exercises every time: the slots go to facile, medio and difficile in turn (then to exercises without a difficulty), each difficulty's picks are spaced evenly through the chapter, and the result is in book order. A chapter with no more exercises than the limit prints all of them.
- The exercises and exam prints show only the **Soluzioni** switch. The formula sheet has no options, so it has no panel.
- The last options chosen in each book are kept in `sessionStorage` for the browser session. A preview opened without options in its address restores the ones it offers and writes them in the address: a chapter gets the exercises and solutions, the whole book also gets the chapters, the formula sheet and the exams, and the exercise and exam prints get the solutions. The scope is not remembered, so the printer on a chapter always opens **Questo capitolo**, and **Tutto il libro** brings the remembered extras back. Options in the address win, so a shared link prints what it says.
- Books loaded one chapter at a time from the platform (`useCloudChapter`) offer only **Questo capitolo**; `/stampa/libro` says so instead of printing.

## How the whole book is assembled

`src/print/parts.tsx` builds the document as a list of parts, in this order:

1. A cover with the subject, title, authors and version from the book config (whatever the book has), and a line with what the document contains.
2. An index of the chapters, their exercise sections and the appendices. It has **no page numbers**: the browser paginates after the app has rendered, and the app cannot read the result.
3. Each chosen chapter on a new page, followed by its exercises when the option is on.
4. The exercises without a chapter, in one section after the last chapter.
5. The formula sheet of the chosen chapters, then all the exam questions.

Exercises print everywhere the same way: the questions with their ids (E3.1…), then a **Soluzioni** block at the end of the section with each solution under the same id. Hints are never printed. Element ids stay unique in one document: `ex-<id>` for exercises, `esame-<id>` for exam questions, and `formula-<id>` only in the formula sheet.

## How it works

The preview is the printed document. There is no pagination engine: the page renders one A4-width sheet (`.print-sheet`) and **Stampa o salva PDF** calls `window.print()`. The browser paginates, so the PDF matches what the student sees in any browser.

- `src/print/PrintPage.tsx`: toolbar, data loading, the options in the URL, and the ready state of the print button.
- `src/print/PrintOptionsPanel.tsx`: the options, in the side panel or in an antd `Drawer` at the bottom on phones.
- `src/print/PrintDocument.tsx`: the sheet, its opener, the optional watermark, and the document's `@page` rules. Running heads (book title, document title) and `page / pages` go in `@page` margin boxes, because margin boxes cannot read text from the DOM.
- `src/print/bodies/`: chapter, cover and index, formulario and exercise bodies. Text goes through `ContentFlow variant="print"`, the same renderer as the screen.
- `src/print/styles/document.css`: sheet layout, page-break rules (`break-inside: avoid` on formulas, figures, list items, exercise questions and solutions; `break-after: avoid` on headings) and the `@media print` reset. The sheet re-maps the theme tokens, so it stays light in dark mode.

In print, internal links print their target (`§3.4`), and formula hovers print as `(1.2)`. Lab and graphs are **not** printable.

### Wide formulas

Chromium shrinks the whole printed document when anything in it is wider than the page: one long formula in Analisi Matematica 2 printed the whole book at 79%. `src/print/fitFormulas.ts` scales each display formula wider than its column down to fit it instead, and leaves the others at full size:

- In print the formula fits the page (`--display-fit-print`), whatever the scale. The print column is the screen column plus the difference between the page and the sheet, so a preview opened on a phone prints the same as one opened on a computer.
- On screen the formula fits the sheet (`--display-fit`) only while its font stays at 12px or more (`READABLE_FORMULA_PX`, the sheet's 9pt small text; a display formula starts at 17.75px). A wider one keeps its size, gets `data-wide` and scrolls sideways inside its own box, with the same fade at the edge as the reader's scrolling formulas. The sheet itself never scrolls sideways.
- An inline formula wider than its line is fitted to the printed line in print (`--inline-fit-print`) and scrolls inside its line on screen, as in the reader.
- Formula-sheet cards print two to a row. A card whose formula is wider than half the row spans the whole row, and the formula is fitted to that.
- Each scale is measured again after it is applied and corrected, because glyph widths snap to whole pixels and a formula does not shrink exactly in proportion. The formulas that may need a scale are measured as copies at a fixed spot, on whole-pixel columns and on steps of 0.005, so a formula gets the same print scale at every preview width.
- A formula that scrolls on screen is a tab stop with a name ("Formula 4.1: label" for a numbered one, "Formula" otherwise), because Safari does not make a scroll container focusable. Both go when it fits again.

The fitting runs when every part is mounted and the fonts have loaded, before **Stampa o salva PDF** enables, and again when a font requested by the measurement arrives or the sheet changes width. Measuring lays out what is kept off screen, so it works through one paragraph, exercise, solution or formula-sheet chapter at a time and yields to the browser every 10 ms. It remembers the width each of these was fitted at, and a MutationObserver forgets the ones whose content changes, so an option that adds or changes a part fits only that part.

### Running heads in the whole book

Each chapter of the whole book is a named page (`page: p-cap-3`) with its own `@page p-cap-3` rule, so the head on its pages shows that chapter's title. A chapter and its exercises share the name; the index, the appendices and the cover have their own, and the cover prints no heads and no page number. Chromium honours named pages with margin boxes; other browsers print the body without heads.

### A large document

A whole book with every extra is large: Chimica di base is about 325,000 elements. The preview stays responsive this way:

- `useProgressiveParts` mounts the cover and the index at once, then one part per task in a transition. The sheet shows which part it is preparing.
- `PrintChapter`, `PrintExerciseSection` and each chapter of the formula sheet are memoized and the exercise picks are cached per list, so a switch re-renders only the parts it changes. The HTML of each numbered formula and formula-sheet card is kept per formula while the book is loaded.
- The panel shows a new option at once from local state. The URL changes after the next paint, in a transition, and the sheet follows it, so a switch never waits for the sheet to re-render.
- On screen, chapters, exercise sections and the formula sheet use `content-visibility: auto`, and so do the paragraphs, exercises, solutions and formula-sheet chapters inside them. Print lays out everything.

**Stampa o salva PDF** stays disabled, reading **Preparazione…**, until every part is mounted, its images and fonts have loaded and its wide formulas are fitted. Ctrl+P waits the same way.

## Browser support

| Browser | Body, page breaks, colours | Running heads and page numbers |
|---------|----------------------------|-------------------------------|
| Chrome, Edge | yes | yes (`@page` margin boxes, named pages per chapter) |
| Firefox, Safari | yes | no (margin boxes not supported yet) |

## Tests

```bash
npm run test:print
```

`e2e/print.spec.ts` covers the previews, print media, the options and the URL, the remembered options, the toolbar at 320px, the phone options sheet, a whole-book PDF export, and a book of wide formulas whose print documents must not be wider than the printed column. `src/lib/printOptions.test.ts` covers the URL parsing, the exercise picks and the remembered options. The cloud-book case runs only with `VITE_PLATFORM_ENABLED=true`.

Print CSS lives in `src/print/styles/` (tokens, shell, document).
