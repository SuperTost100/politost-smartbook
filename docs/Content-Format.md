# Content Format

Every smartbook is a **folder** (or the inner tree of a `.ptsb` package).

## Folder layout

```text
<id>/
├── smartbook.json
├── chapters/
│   └── 01-capitolo.md
├── esercizi.md      # optional
├── esami.md         # optional
├── ide.json         # optional — lab snippets
├── grafici.json     # optional — Plotly / function plots
└── assets/          # optional — local images only
```

Reference implementation: `src/content/esempio/`.

## smartbook.json

```json
{
  "id": "esempio",
  "title": "Guida di esempio",
  "subject": "Esempio",
  "access": "public",
  "sections": {
    "smartbook":  { "enabled": true, "label": "Capitoli" },
    "formulario": { "enabled": true, "label": "Formulario" },
    "esercizi":   { "enabled": true, "label": "Esercizi" },
    "esami":      { "enabled": false, "label": "Prove d'esame" },
    "ide":        { "enabled": true, "label": "Laboratorio" },
    "grafici":    { "enabled": true, "label": "Grafici" },
    "risposte":   { "enabled": false, "label": "Soluzioni" }
  },
  "chapters": [
    {
      "id": "benvenuto",
      "number": 1,
      "title": "Benvenuto",
      "file": "01-benvenuto.md",
      "printable": true
    }
  ]
}
```

- `id` → URL `/libro/<id>`
- `access`: `public` (default) or `licensed` (encrypted `.ptsb` + platform DRM when integrated)

## Chapter markdown

### Paragraphs (required)

```markdown
## p1 | Title

Body text with **bold** and inline math $E=mc^2$.
```

Inside a paragraph the text is CommonMark (rendered by markdown-it in `@politost/content-core`):

| Works | Syntax |
|-------|--------|
| Bold, italic | `**bold**`, `*italic*` |
| Sub-headings | `### Title`, `#### Title` |
| Bullet and numbered lists, nested | `- item`, `1. item` (numbering may continue after a formula: `2. item`) |
| Quotes | `> text` |
| Code | `` `inline` ``, fenced blocks with ```` ``` ```` |
| Rule | `---` on its own line, with a blank line before it |
| Math | `$…$`, `$$…$$`, `\(…\)`, `\[…\]`, protected from markdown, so `_` and `*` inside math are safe |

Not supported on purpose: tables, raw HTML (escaped), markdown images (use `:::image`), indented code blocks (indentation is ignored), and setext headings (`Title` followed by `---` is text plus a rule).

### Numbered formulas

```markdown
:::formula{id="2.1" label="Velocità media"}
$$v = \frac{s}{t}$$
:::
```

Reference in text: `{{formula:2.1}}` (keep spaces around markers).

### Internal links

```markdown
[formulario](ref:formula/2.1)
[capitolo 2](ref:chapter/2#p1)
```

### Images (assets only)

```markdown
:::image{src="assets/schema.svg" alt="Description" caption="Fig. 2.1 — Caption"}
:::
```

## Exercises (`esercizi.md` / `esami.md`)

```markdown
:::exercise{id="E1.1" chapter="1" difficulty="facile"}
## Domanda
…

:::hint
…
:::

:::solution
…
:::
:::
```

## Lab (`ide.json`)

```json
[
  {
    "id": "hello",
    "title": "Primo programma",
    "language": "python",
    "description": "…",
    "code": "print('Ciao')"
  }
]
```

Languages: `python` (Pyodide), `matlab` / `octave` / `m` (didactic subset).

Python scripts can import the standard library, `numpy` and `matplotlib`. The first script that imports one of them downloads it, which can take a few seconds. The lab shows every open matplotlib figure under the text output as an image, up to 10 per run, so `plt.show()` is optional.

## Graphs (`grafici.json`)

Type `function` (expression in `x`) or native `plotly` config.

A `function` expression can use `+ - * / ^`, parentheses, `pi`, `e`, and these functions, bare or as `Math.sin`: `sin cos tan asin acos atan atan2 sinh cosh tanh sqrt abs log log2 log10 exp ceil floor round max min sign pow`. For example `exp(-x/2) * cos(2*pi*x)`. Anything else draws nothing.

Axis titles in a `plotly` layout can be a string (`"title": "Ore"`) or `{ "text": "Ore" }`.

## Validation

```bash
npm run validate:chapter -- --file path/to/chapter.md --chapter-number N
```

## Limitations

| Area | Limit |
|------|-------|
| Markdown | No tables; images only from `assets/` |
| Python lab | No preinstalled numpy/matplotlib |
| MATLAB lab | Subset only (no `for`, user functions, matrices) |

Syntax changes require parser + validator updates — treat this page as the author contract.
