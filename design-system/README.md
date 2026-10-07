# PoliTost Smartbook — design system

Status: v1, 30 Sep 2026. The live version, with previews and comments, is the "PoliTost Smartbook" Design System artifact on claude.ai. This folder is the offline, code-ready copy.

Smartbook is Pyxis' sibling: same skeleton (antd v6 + Ant Design Pro, Figtree + JetBrains Mono, pill actions, uppercase mono labels, the same neutral greys), but a book. **Light paper first** with a full dark theme, **Source Serif 4** for the text, **teal ink-green** as its own colour, and Pyxis' **star gold** reused as the bookmark that marks where you are. The logo is an **open book with a gold ribbon**.

## Stack

- Vite + React 19 (the existing app), **antd v6** + **Ant Design Pro components** (`@ant-design/pro-components` v3, beta `3.1.15-3`: pin it).
- Not the Umi-based Ant Design Pro template. See `docs/ant-design-pro.md`.
- Fonts: Source Serif 4, Figtree, JetBrains Mono, bundled. Icons: `lucide-react`. Math: KaTeX.

## Folders

| Folder | What |
| --- | --- |
| `docs/` | `foundations.md` (principles, voice, colour, type, layout, logo), `components.md` (every custom component), `ant-design-pro.md` (antd / Pro mapping), `migration.md` (old CSS variables → tokens, step-by-step swap) |
| `tokens/` | `tokens.json` (source of truth), `tokens.css` (CSS variables for both themes, `@font-face`, `.t-*` type classes) |
| `theme/` | `ptsb-theme.ts` (antd v6 theme + ProLayout token), `ReaderShell.tsx` (ProLayout `mix` reader shell) |
| `fonts/` | Variable woff2 files, OFL |
| `icons/` | Lucide sprite of the icons the design uses |
| `logo/` | Mark (light, dark, mono, small), lockups, app icon SVG + PNG 16–1024 |
| `reference/` | `index.html` (every component, light/dark toggle, opens offline), `bundle.css`, `bundle.js`, `index.d.ts`, `lib/` (React 18 UMD + KaTeX for the offline page only) |

## Quick start

```bash
npm i antd@^6.6 @ant-design/pro-components@3.1.15-3 lucide-react
```

```tsx
import './design-system/tokens/tokens.css';
import { ReaderShell } from './design-system/theme/ReaderShell';

<ReaderShell mode={mode} lang="it" subject="Fisica" bookTitle="Fondamenti di Fisica Generale"
  sections={sections} activeSection="smartbook" onSection={go}
  chapters={chapters} activeChapterId={chapterId} activeParagraphId={paraId} progress={35}
  onNavigate={navigate} onToggleTheme={toggle} onPrint={print}>
  …chapter…
</ReaderShell>
```

`theme/*.ts(x)` type-checks against antd 6.6.5, pro-components 3.1.15-3 and React 19. `reference/bundle.js` is the preview build of the custom components, not production code: rebuild them as TSX using `bundle.css` and `docs/components.md` as the spec. Start with `docs/migration.md`.

## Change rules

Change a value in `tokens/tokens.json` first, then mirror it in `tokens.css` and `theme/ptsb-theme.ts`. Keep every text pair at 4.5:1 and every control edge, focus ring and mark at 3:1, in both themes.
