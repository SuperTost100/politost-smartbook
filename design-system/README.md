# PoliTost Smartbook design system

Version 2, direction **Carta**, from 2026-11-03: paper objects on a desk. Controls are raised and press in when they are on, the chapter sits on a sheet of paper, every book has a matte cover with a line drawing of its subject, and the accent is terracotta. Smartbook has its own look now and no longer shares Pyxis' teal and mono labels.

Start with [`docs/foundations.md`](docs/foundations.md). The visual reference for every screen is [`mockups/b-carta.html`](mockups/b-carta.html).

## Stack

- Vite and React 19 (the app), with **antd v6** for forms and overlays. The reader shell is our own CSS grid, so there is no Ant Design Pro any more. See [`docs/antd.md`](docs/antd.md).
- Fonts: Newsreader, Hanken Grotesk and JetBrains Mono, bundled. Icons: `lucide-react`. Math: KaTeX.

## Folders

| Folder | What |
| --- | --- |
| `docs/` | `foundations.md` (principles, voice, colour, type, layout, logo), `components.md` (every component and its file), `antd.md` (what still uses antd and how it is themed) |
| `tokens/` | `tokens.json` (the source of truth), `build.mjs` (writes `tokens.css` and `theme/ptsb-tokens.ts`), `tokens.css` (CSS variables for both themes, `@font-face`, cover colours, `.t-*` type classes) |
| `theme/` | `ptsb-theme.ts` (the antd v6 theme), `ptsb-tokens.ts` (generated colours, shadows, covers, fonts and sizes for code) |
| `fonts/` | Variable woff2 files, OFL |
| `icons/` | Lucide sprite of the icons the design uses |
| `logo/` | Mark (light, dark, mono, small), lockups, app icon SVG and PNG 16 to 1024 |
| `mockups/` | The three redesign directions from October 2026: `a-libreria.html`, `b-carta.html`, `c-ambra.html`. Tost picked B, Carta, on 2026-11-03, and A and C stay here for reference. Edit `src/`, then rebuild with `node design-system/mockups/src/build.mjs` |

## Change rules

1. Change a value in `tokens/tokens.json`.
2. Run `npm run tokens` to regenerate `tokens.css` and `theme/ptsb-tokens.ts`.
3. Keep every text pair at 4.5:1 and every control edge, focus ring and mark at 3:1, in both themes. `src/lib/tokens.test.ts` checks the main pairs.
