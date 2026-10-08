# Ant Design Pro mapping

Smartbook uses the same stack as Pyxis: **antd v6** plus **ProComponents v3** (`@ant-design/pro-components`, the antd-6 line, still tagged beta: pin `3.1.15-3`). It is a component layer inside the existing Vite + React app, not the Umi-based Ant Design Pro template.

## Setup

```bash
npm i antd@^6.6 @ant-design/pro-components@3.1.15-3 lucide-react
```

```tsx
import './design-system/tokens/tokens.css';
import './design-system/reference/bundle.css'; // until the custom components are rebuilt as TSX
import { ReaderShell } from './design-system/theme/ReaderShell';
```

- `theme/ptsb-theme.ts`: `ptsbTheme(mode)` for antd and every ProComponent; `ptsbProLayoutToken(mode)` for ProLayout's header, sider and page container; `ptsbColors`, `ptsbLayout` and the font stacks for code that needs raw values.
- `theme/ReaderShell.tsx`: the working reader shell (type-checked against antd 6.6.5, pro-components 3.1.15-3, React 19).
- `cssVar` prefix `sb`, `hashed: false`: antd emits `--sb-*` variables beside the design-system variables. Set `<html data-theme>` on the same switch (the shell does) so custom components follow.
- Icons: `lucide-react` at `strokeWidth={1.75}`. Do not add `@ant-design/icons`.
- Locales: antd `it_IT` / `en_US`.
- KaTeX, Plotly and Monaco stay; theme them from the tokens (see GraphPanel and CodeCell in `components.md`).

## Which component for what

| Smartbook need | Use | Notes |
| --- | --- | --- |
| Reader shell | `ProLayout` `layout="mix"`, `fixedHeader`, `fixSiderbar`, `breakpoint="lg"` | Lockup as `logo`, section tabs in `headerContentRender`, print/theme in `actionsRender` |
| Section tabs | `Segmented shape="round"` | Icons only below `xxl`; hidden in the drawer below `lg` |
| Chapter TOC | ProLayout `route` + `menuExtraRender` for the book block | Paragraphs of the active chapter as child routes; drawer on mobile comes free |
| Paragraph rail | `Anchor` with `getCurrentAnchor` | Visible from `xl`; `Progress` below for the chapter read |
| Formula reference preview | `Popover trigger={['hover','focus']}` | Replaces the mouse-only tooltip |
| Hint / solution | custom `RevealBlock` | `Collapse` is too heavy for inline reveals |
| Exercises, formulario cards | `Card` or `ProCard` | Custom header rows as in `bundle.css` |
| Library grid | `ProList` with `grid={{ gutter: 16, column: 3 }}` or `Row`/`Col` of `BookCard` | |
| `.ptsb` import | `Upload.Dragger accept=".ptsb" showUploadList={false}` | States as in `ImportDropzone` |
| Lab | Monaco + custom `CodeCell` chrome | One `primary` (Esegui) per view |
| Graphs | Plotly + numbered list and previous / next; native select on phones | Plot colours from `chart-*` tokens; legend in `GraphPanel` |
| Auth / terms pages | `ProForm`, `LoginForm` | Same tokens; only when the platform features are on |
| Confirmations, toasts | `App.useApp()` `modal.confirm`, `message` | Removing a book always confirms |

## Rules

- Nothing should look like stock antd or stock Pro: default blue, grey Pro page headers or a dark admin sider mean a token is missing.
- No breadcrumbs and no Pro page titles: the chapter title lives in the page body (`ChapterHeader`).
- Never set colours inline. `theme.useToken()` in antd code, `var(--token)` in CSS.
