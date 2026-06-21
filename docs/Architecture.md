# Architecture

```
src/
├── content/       # Builtin smartbooks (build-time glob)
├── lib/
│   ├── loader.ts      # Catalog: builtin + IndexedDB uploads
│   ├── parser.ts      # Markdown DSL → AST
│   ├── renderContent.ts
│   ├── ptsb.ts          # .ptsb import
│   └── validateChapter.ts
├── components/    # Reading UI
├── print/         # Paged.js print subsystem
├── pages/         # Home, book router, legal
└── workers/       # Pyodide Python worker
```

## Stack

| Layer | Tech |
|-------|------|
| UI | React 19, TypeScript, Vite |
| Routing | React Router 7 |
| Math | KaTeX |
| Lab editor | Monaco |
| Graphs | Plotly.js |
| Python | Pyodide (self-hosted) |
| Print | Paged.js (iframe) |

## Data flow

```
smartbook.json + chapters/*.md
  → parseChapterMarkdown()
  → ContentFlow (screen / print)
```

Formulario aggregates numbered formulas from all chapters automatically.

## Rewrite boundary (target)

| Package | Contents |
|---------|----------|
| `@politost/content-core` | parser, render, validate |
| `@politost/print-engine` | `src/print/` |
| `@politost/reader` | SPA shell, catalog, routes |
| Politost platform (private) | auth, licenses, cloud, keys |

Reader accepts `ReaderConfig` for optional platform features:

```ts
{ apiBaseUrl?, features: { auth?, drm?, cloud? } }
```

## Tests

| Suite | Command |
|-------|---------|
| Content/parser | `npm run test:content` |
| Security/sanitize | `npm run test:security` |
| Print unit | `npm run test:print:unit` |
| E2E | `npm run test:e2e` |
