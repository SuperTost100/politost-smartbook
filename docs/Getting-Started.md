# Getting Started

## Requirements

- Node.js 20+
- npm 10+

## Install & run

```bash
git clone https://github.com/SuperTost100/politost-smartbook.git
cd politost-smartbook
npm install
npm run dev
```

Open http://localhost:5173 and click **Guida di esempio** (`/libro/esempio`).

First `npm install` copies Pyodide into `public/` — wait until you see `Copied pyodide assets`. That is normal; the app does not need anything else to start.

## Useful commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Dev server |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview production build |
| `npm run validate:chapter` | Validate one chapter markdown file |
| `npm run pack:ptsb` | Pack a content folder to plain `.ptsb` |

### Validate a chapter

```bash
npm run validate:chapter -- \
  --file src/content/esempio/chapters/02-nel-libro.md \
  --chapter-number 2
```

### Pack a book

```bash
npm run pack:ptsb -- --dir src/content/esempio --out esempio.ptsb
```

## Try without cloning

1. Build or download a release artifact
2. Serve `dist/` with any static host — see [Self-Hosting](Self-Hosting)
3. Upload a `.ptsb` from the home page

## Next steps

- Write content → [Content Format](Content-Format.md)
- Distribute files → [PTSB Import](PTSB-Import.md)
- Deploy → [Self-Hosting](Self-Hosting.md)

## Contributors

Automated browser tests (`npm run test:e2e`) are for maintainers only. They download Chromium on first run via `npm run prepare:e2e` — not part of normal install.
