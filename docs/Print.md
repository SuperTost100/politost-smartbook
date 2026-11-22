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

Definitions, theorems and the other boxes print as in the reader, with lighter tints and no control on proofs, which are always open. The kind is in the label word and the rule on the left (2pt for definitions and theorems, 1.5pt for mistakes, 1pt for the rest), so a black and white printout still tells them apart. A box of a few blocks keeps `break-inside: avoid` (`boxIsShort` in `src/lib/boxes.ts`); a longer one, such as a long proof, breaks across pages, and its label row stays with its first lines (`break-after: avoid`). A formula inside a box is fitted to the box's narrower column like any other, because the box's padding has a fixed width.

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
- The print document leaves out KaTeX's hidden MathML copy of each formula (`withoutMathml`), about a quarter of a whole book's elements.

**Stampa o salva PDF** stays disabled, reading **Preparazione…**, until every part is mounted, its images and fonts have loaded and its wide formulas are fitted. Ctrl+P waits the same way.

### Flat formulas

KaTeX draws a formula with about ten elements per glyph, and the browser lays all of them out again when it prints: they were most of the 268,000 elements of Fisica 1 and most of the time `window.print()` took. Once the preview is ready, `src/print/flatFormulas.ts` replaces each segment of a formula (`.katex-base`, the part between two places where it may break) with a box of the same size that holds one absolutely positioned span per text run, plus the rules and SVGs KaTeX draws, at the positions KaTeX gave them in em of the formula's font size. The parts sit in a box with `contain: size layout` and `overflow: clip`, so the browser lays out and paints each segment on its own.

- **When.** The pass starts after the print button shows ready, so the preview opens as fast as before. It works a paragraph, exercise, solution or formula-sheet chapter at a time, in slices of 10 ms like the fit, and the sheet's `data-math` reads `flattening`, then `flat`. An option or a chapter that changes the document flattens only the parts it adds or changes; a new sheet width runs the fit, then the pass again.
- **Printing before it finishes.** **Stampa o salva PDF** and Ctrl+P flatten what is left first, behind **Preparazione…**, then print. Flattening Fisica 1 takes about 1.5 s and saves the browser about 15 s when it prints (11 s and 88 s on a CPU six times slower), so finishing first is always faster. The browser's own print menu cannot wait: it prints a mix of flat and KaTeX formulas, which look the same.
- **What stays as KaTeX drew it.** A formula drawn on screen at another size than in print (scaled differently, or scrolling on a phone), and a segment with a link, an image or an id. Equation tags are not flattened.
- **Same places.** Every size and offset lands on the 1/64 px layout works in, and the baselines are read from probes, so the text runs of the four catalog books sit where KaTeX put them on screen, and a printed book has the same pages. Print rounds each baseline to whole px from the top of the box the glyphs sit in, which a flat run cannot always copy: in the PDFs of the four books about 1% of the words in formulas sit up to 1 px higher or lower than KaTeX's. The box ends at the segment's right edge, because a box past it would make a line-ending formula wider than the page (see the next section); a run whose ink passes that edge, like the tail of an italic letter, stays outside the box. The box grows on the other sides to the ink of its runs, measured on a canvas, plus 1 px.
- **The fit.** A flat formula keeps the print scale the fit measured on KaTeX's tree; only its screen scale is measured again when the width changes.
- **Fonts.** A unit read while a font was loading is not written: it is read again once the fonts have arrived.

`?math=katex` in the address turns flattening off, for support and to measure one against the other. The options keep it in the address. `printMathMode` in `src/print/printMath.ts` reads it.

### Formulas at the end of a line

KaTeX ends every sub- or superscript with an empty cell 2 px wide and pulls what follows back over it with a -2 px margin. The cell reached past the formula, so an inline formula that ended a line made the page wider than the paper, and Chromium printed the whole of Fisica 1 at 99.8%. In the print sheet the cell has no width and no negative margin, which changes nothing inside the formula.

## Formule

The options panel ends with **Formule**: **Migliore** prints the book's KaTeX, and **Veloce** (fast print) prints each formula as MathML from [Temml](https://temml.org), which the browser lays out and prints many times faster. The mode applies to every print: chapters, the whole book, exercises, exam questions and the formula sheet, which has no panel but follows the same mode. The reader keeps KaTeX.

| Fisica 1, whole book | Migliore | Veloce |
|---|---|---|
| From opening the preview to the saved PDF | 21 s | 7 s |
| From **Stampa o salva PDF** to the saved PDF | 17 s | 3.4 s |
| Both, with the CPU 6 times slower | 142 s and 118 s | 43 to 44 s and 21 to 23 s |
| Pages | 374 | 377 |

### Which mode a device gets

`src/lib/printFormulaMode.ts` decides, and keeps its inputs in `localStorage` (`politost-print-formulas`) for every book on the device:

1. A mode the student chose by hand, in the panel or from the line above the sheet. It wins over everything below, for good.
2. Two cores or 2 GB of memory or less (`navigator.hardwareConcurrency`, `navigator.deviceMemory`): Veloce.
3. The device measurement above `SLOW_LAYOUT_MS`: Veloce. Otherwise Migliore.

The measurement (`src/print/deviceSpeed.ts`) times the browser parsing and laying out a fixed paragraph of KaTeX, about 2,000 elements, in a contained box off screen, and keeps the best of three runs. It runs once per device, when the print page is first idle, and the sheet waits for it (tens of ms) so a slow device never lays out the KaTeX it would replace. `MEASUREMENT_VERSION` measures every device again when the benchmark changes.

The threshold is the measurement above which printing Fisica 1 as a whole book in Migliore takes more than about a minute, from opening the preview to the saved PDF. It was calibrated with CPU throttling in Chromium (`Emulation.setCPUThrottlingRate`): the script opens the whole book, clicks **Stampa o salva PDF** the moment it is ready, which in Migliore finishes the flattening first, and saves the PDF with `page.pdf()` once the page calls `window.print()`. Times are in seconds, and each cell holds the two runs:

| CPU slowdown | Measurement | Migliore, from opening | Migliore, from the click | Veloce, from opening | Veloce, from the click |
|---|---|---|---|---|---|
| 1× | 21.3 and 21.6 ms | 21.3 and 21.1 | 17.2 and 17.1 | 7.1 and 7.1 | 3.4 and 3.4 |
| 2× | 46.7 and 46.6 ms | 45.1 and 44.6 | 37.1 and 36.7 | 14.2 and 14.2 | 7.2 and 7.2 |
| 4× | 98.5 and 91.9 ms | 93.3 and 92.3 | 77.3 and 76.9 | 28.1 and 27.8 | 14.4 and 14.2 |
| 6× | 145.3 and 148.3 ms | 142.5 and 142.3 | 118.3 and 118.6 | 44.4 and 42.6 | 23.0 and 21.4 |
| 8× | 196.2 and 188.4 ms | 199.1 and 198.4 | 165.0 and 165.9 | 58.6 and 59.4 | 29.7 and 30.2 |

Of the time from the click in Migliore, finishing the flattening took 1.4 s at 1× and 14 s at 8×, and the rest is the browser printing. The two runs of each point ran on 2026-11-21, with no build, test run or other benchmark on the machine (the script waited for them to end before each run): the measurement varied by up to 7% between runs, the Migliore times by up to 1% and the Veloce times by up to 7%. With flat formulas Migliore takes about 1.0 s per ms of measurement (1.6 s before them), so a minute is about 60 to 62 ms, and `SLOW_LAYOUT_MS` is 60. The hardware rule is not calibrated, because CPU throttling does not change the number of cores or the memory a page sees.

A device given Veloce by the measurement shows a line above the sheet, "Stampa veloce attiva, scelta per questo dispositivo", with **Usa le formule migliori** and **Vedi la differenza**, which shows the same formula in both modes. After the student goes back to Migliore on such a device, a quieter line offers fast print again: "Su questo dispositivo le formule migliori rallentano la stampa: con la stampa veloce il documento è pronto in circa un terzo del tempo.", with **Passa alla stampa veloce**. Either action moves keyboard focus to the new line, or to the sheet when the line goes away. A fast device shows no line.

### How fast print draws

- **Rendering.** `katexToMathml` (`src/lib/printMathml.ts`) takes the TeX of each formula from KaTeX's `<annotation>`, which already has the decimal-comma rewrite, and renders it with Temml (`src/lib/temmlRender.ts`, results cached per page). A display formula becomes `<span class="mml-display"><math display="block">`, an inline one `<span class="mml"><math>`, with soft line breaks after relations and binary operators as in KaTeX. A formula Temml cannot render stays KaTeX. In the four catalog books (41,846 formulas, counting each numbered formula in its chapter and in the formula sheet) none falls back.
- **Lazy chunk.** `src/print/fastPrint/` holds Temml, its STIX2 stylesheet scoped to the sheet, and the font: about 61 KB of gzipped JavaScript, 2 KB of CSS and the 290 KB font. It loads only when Veloce is in use.
- **Font.** STIX Two Math (SIL OFL 1.1), built by `scripts/build-print-math-font.py` as a 290 KB woff2 from the 838 KB otf. The script gives the right arrow's head the start connector it lacks, so Chromium stretches `\xrightarrow` and `\overrightarrow`; lowers the label over a stretched arrow from 0.8em to Latin Modern Math's 0.111em; and keeps the characters, size variants, assembly parts and OpenType features TeX math uses. Formulas are set at 1.13em, which gives the x-height of KaTeX's 1.21em, so lines and pages keep their size.
- **Line spacing.** The browser sizes an inline formula to the ink of its scripts and accents, where KaTeX uses TeX's box heights, so a subscript pushed its line away from the next one. An inline formula has `margin-block: -0.25em`, which lets it reach that far into the leading before the line grows.
- **Spacing.** Veloce cannot match KaTeX glyph for glyph, but its spacing follows TeX's where Temml or Chromium's operator spacing differ:
  - `texForTemml` (`temmlRender.ts`) puts an empty group after a comma between two digits that content-core left as written, because Temml reads `[0,1]` as the number "0,1"; a decimal comma reaches Temml as `{,}` and stays one number. `\verb` text stays as written.
  - `breakDisplaystyle` handles an inline formula that starts with `\displaystyle`, which Temml puts whole in one `<mstyle>` that cannot break: Esempio 4.8 of Analisi Matematica 2 printed at 96%. The TeX keeps the command, so limits and `\mathchoice` come out in display style, and the `<mstyle>` becomes `displaystyle="true"` on `<math>`, its children cut into the segments Temml's `wrap: 'tex'` makes for any other inline formula.
  - `mathSpacing` rewrites Temml's MathML: the thin space before an operator name after a script, a fraction, a root or a bracket ("n c_V ln" printed as "ncᵥln"), and after it before `\left(`; a thin space between a `\left…\right` group and a letter on either side; no space around operators in scripts and limits ("k=1", "n→∞"); the medium space of a binary operator for `×`, `⋅` and the others Chromium spaces by 3/18 em; and no space of its own for a big operator after an operator, a bracket or at the start.
  - `fastPrint.css` pads a matrix or `cases` inside its delimiters by 0.15em (the bars of a determinant touched its entries), gives a fraction TeX's 0.12em on each side, and lowers the `\vec` arrow, which `mathSpacing` marks with the class `print-vec`, by 0.2em, because Temml draws it as an over-script, which Chromium sets as high as a limit.
  - `trimMathBoxes` (`src/print/mathmlBoxes.ts`) runs before each unit is fitted and gives a negative end margin to two boxes Chromium makes wider than it draws them: a root, sized for the widest radical sign in the font (0.42em too wide over a letter, so "√(2gh) , dove"), and an integral with limits, whose lower limit moves left by the sign's italic correction (0.54em at display size) while its width stays. CSS cannot tell either case apart, so the gap is measured.
- **Punctuation.** Temml's `<math>` is a wrapping flex box, and a formula that wraps takes the whole line, so a full stop glued after it as in KaTeX (`.math-glue`) printed past the text column: Fisica 1 printed at 99.55%. The punctuation after an inline formula goes at the end of the formula's last segment instead, as `<mtext class="math-punct">` in the text's font and size, where it stays on the formula's last line and counts in the fit.
- **Fitting.** `fitWideFormulas` fits `.mml-display` and `.mml` as it fits KaTeX, measuring the children of `<math>`.
- **Switching.** A new mode reaches the parts one at a time (`usePartMathml`), with the sheet dimmed and **Stampa o salva PDF** waiting, then the formulas are fitted again and the KaTeX ones flattened again. A switch while a pass runs stops it.
- **Flat formulas.** The flattening pass runs on a fast-print sheet too, where it finds KaTeX only in formulas that fell back. **Stampa o salva PDF** waits for it only when the sheet holds KaTeX, so Veloce prints at once.

## Browser support

| Browser | Body, page breaks, colours | Running heads and page numbers |
|---------|----------------------------|-------------------------------|
| Chrome, Edge | yes | yes (`@page` margin boxes, named pages per chapter) |
| Firefox, Safari | yes | no (margin boxes not supported yet) |

## Tests

```bash
npm run test:print
```

`src/lib/flatFormulas.test.ts` covers the lengths of flat formulas, which parts stay outside the clipping box and which KaTeX classes draw. `e2e/print.spec.ts` covers the previews, flat formulas (after readiness, at KaTeX's positions, printing at once, `?math=katex`, an option), print media, the options and the URL, the remembered options, the toolbar at 320px, the phone options sheet, a whole-book PDF export, and a book of wide formulas whose print documents must not be wider than the printed column. `src/lib/printOptions.test.ts` covers the URL parsing, the exercise picks and the remembered options. The cloud-book case runs only with `VITE_PLATFORM_ENABLED=true`.

`e2e/fast-print.spec.ts` covers fast print: the default on a slow device, the line and its samples, a choice that survives a reload, every kind of print, links and their targets, stretched arrows, even line spacing, wide formulas and a formula Temml cannot render. With flat formulas it covers printing Veloce at once, a switch from Migliore to Veloce and back (also while a pass runs), a new width and `?math=katex` in each mode. `src/lib/printFormulaMode.test.ts` covers the decision and its storage, `src/lib/printMathml.test.ts` the conversion. Every e2e spec starts from a stored measurement of a fast device (`playwright.config.ts`), so the machine that runs them cannot switch them to fast print.

Print CSS lives in `src/print/styles/` (tokens, shell, document).
