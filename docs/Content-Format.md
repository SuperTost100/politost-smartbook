# Content Format

Every smartbook is a **folder** (or the inner tree of a `.ptsb` package).

## Folder layout

```
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

## Graphs (`grafici.json`)

Type `function` (expression in `x`) or native `plotly` config.

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
