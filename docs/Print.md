# Print Preview

The printer icon in the reader's top bar (**Versione stampabile**, or Ctrl+P / Cmd+P) opens the preview of the page on screen: the chapter, the formula sheet, the exercises or the exam questions. Page headers have no print button.

## Routes

| Content | URL |
|---------|-----|
| Chapter | `/libro/<id>/stampa/capitolo/<chapter-id>` |
| Formulario | `/libro/<id>/stampa/formulario` |
| Exercises | `/libro/<id>/stampa/esercizi` |
| Exams | `/libro/<id>/stampa/esami` |

Requires `printable: true` on the chapter or exercise frontmatter.

The exercise and exam routes take the filters of the page they were opened from, so the printout matches the screen:

| Parameter | Values | Applies to |
|-----------|--------|------------|
| `capitolo` | a chapter number, `tutti`, or `altri` (exercises without a chapter) | `esercizi` |
| `difficolta` | `facile`, `medio`, `difficile` | `esercizi`, `esami` |

The document title, the running head and the saved PDF's name include them, for example `Esercizi · Capitolo 3. Formule e nomenclatura inorganica · Livello difficile`. A missing or unknown value prints everything.

## How it works

The preview is the printed document. There is no pagination engine: the page renders one A4-width sheet (`.print-sheet`) and **Stampa o salva PDF** calls `window.print()`. The browser paginates, so the PDF matches what the student sees in any browser.

- `src/print/PrintPage.tsx`: toolbar, data loading, waits for images and fonts before opening the print dialog.
- `src/print/PrintDocument.tsx`: the sheet, its opener, the optional watermark, and a per-document `@page` rule. Running heads (book title, document title) and `page / pages` go in `@page` margin boxes, because margin boxes cannot read text from the DOM.
- `src/print/bodies/`: chapter, formulario and exercise bodies. Text goes through `ContentFlow variant="print"`, the same renderer as the screen.
- `src/print/styles/document.css`: sheet layout, page-break rules (`break-inside: avoid` on formulas, figures, list items; `break-after: avoid` on headings) and the `@media print` reset. The sheet re-maps the theme tokens, so it stays light in dark mode.

In print, hints and solutions are always visible, internal links print their target (`§3.4`), and formula hovers print as `(1.2)`. Lab and graphs are **not** printable. Formulas too wide for the formulario grid span the row and, if still too wide, are scaled down (`useWideFormulaCards`).

## Browser support

| Browser | Body, page breaks, colours | Running heads and page numbers |
|---------|----------------------------|-------------------------------|
| Chrome, Edge | yes | yes (`@page` margin boxes) |
| Firefox, Safari | yes | no (margin boxes not supported yet) |

## Tests

```bash
npm run test:print    # Playwright: preview, print media, PDF export
```

Print CSS lives in `src/print/styles/` (tokens, shell, document).
