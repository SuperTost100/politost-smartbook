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

## Useful commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Dev server |
| `npm run build` | Production build → `dist/` |
| `npm run preview` | Preview production build |
| `npm run validate:chapter` | Validate one chapter markdown file |
| `npm run pack:ptsb` | Pack a content folder to plain `.ptsb` |
| `npm run test:content` | Parser/math unit tests |
| `npm run test:print` | Print e2e (Playwright) |
| `npm run test:e2e` | Full e2e suite |

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
