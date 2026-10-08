# Architecture

```
src/
├── content/       # Builtin smartbooks (build-time glob)
├── lib/
│   ├── loader.ts      # Catalog: builtin + IndexedDB uploads
│   ├── parser.ts      # re-exports @politost/content-core
│   ├── renderContent.ts # markdown-it → ContentBlock tree
│   ├── ptsb.ts          # .ptsb import
│   └── validateChapter.ts
├── components/    # Reading UI
├── print/         # Print preview (A4 sheet + browser print)
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
| Markdown | markdown-it (CommonMark) in content-core |
| Print | Browser print + `@page` CSS |

## Data flow

```
smartbook.json + chapters/*.md
  → parseChapterMarkdown()          # paragraphs, numbered formulas, images
  → parseContentBlocks()            # markdown-it; math and refs protected first
  → ContentFlow (screen / print)
```

Formulario aggregates numbered formulas from all chapters automatically.

## Rewrite boundary (target)

| Package / module | Contents |
|------------------|----------|
| `@politost/content-core` | parser, render, validate |
| `src/print/` | Print preview (inlined in reader) |
| Politost platform (private) | auth, licenses, cloud, keys |

Reader accepts `ReaderConfig` for optional platform features:

```ts
{ apiBaseUrl?, features: { auth?, drm?, cloud?, audit?, watermark? } }
```

`src/main.tsx` picks it at build time: the standalone reader (`defaultReaderConfig`, everything off) unless `VITE_PLATFORM_ENABLED=true`, which turns on the platform shell (`platformReaderConfig`). The e2e suite builds with `VITE_PLATFORM_ENABLED=true` because it covers login and redeem.

## Tests

| Suite | Command |
|-------|---------|
| Content/parser | `npm run test:content` |
| Reader unit tests | `npm run test:unit` |
| Security/sanitize | `npm run test:security` |
| Print | `npm run test:print` |
| E2E | `npm run test:e2e` |
