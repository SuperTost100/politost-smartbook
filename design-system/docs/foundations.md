# PoliTost Smartbook design system — foundations

PoliTost Smartbook (PTSB) is the open-source web reader for smartbooks: interactive textbooks with chapters, a formulario, exercises, exam papers, a Python/MATLAB lab and graphs. It is the sibling of **PoliTost Pyxis** and shares its skeleton (Ant Design v6 + Ant Design Pro, Figtree, JetBrains Mono, pill actions, uppercase mono labels, the same neutral greys), but it is a *book*: light paper first, a serif for the text, a teal ink-green of its own, and the Pyxis star gold reused as the bookmark that marks where you are.

## Principles

- **The text comes first.** The chapter column is the calmest thing on screen: serif `reading` on `page`, 68ch wide, nothing animated beside it. Chrome (header, TOC, rail) sits on `bg` and never competes.
- **Always show where you are.** The gold `star` marks the current position and nothing else: the current paragraph in the TOC and rail, the logo's bookmark ribbon, bookmarks. Never use gold for decoration.
- **Numbers are addresses.** Paragraphs (2.2), formulas (2.1), exercises (E2.3), figures (Fig. 2.1) always show their number in `meta` mono, so a student can cite and find them.
- **Reveal, don't spoil.** Hints and solutions stay closed until asked, and can be closed again.
- **Local and honest.** Imported `.ptsb` files stay in the browser; status and errors are plain sentences with the fix.

## Content fundamentals

- Italian first, English second. Italian runs about 20% longer; every label must have room for it.
- Address the student as **tu**: "Trascina qui un file .ptsb", "Prova tu". The book text is the author's; the interface never talks over it.
- Sentence case everywhere ("Versione stampabile", "Mostra soluzione"). UPPERCASE only through the `label` style: section tabs, eyebrows (CAPITOLO 2, IN QUESTO CAPITOLO), the Suggerimento/Soluzione labels.
- Short and concrete: "12 paragrafi · circa 25 min", "Analisi Matematica I aggiunto alla libreria.", "Immagine non disponibile: assets/schema.svg". No hype, no exclamation marks.
- Numbers as data in `meta` mono: "(2.1)", "E2.3", "cap. 2", "35 %". Put a space before %, as Italian typography wants.
- No emoji in UI copy or book chrome.

## Color

Light (paper) is the primary theme; dark is fully designed. Set `data-theme="light|dark"` on `<html>`; the reader follows the system setting until the student toggles it.

- **Grounds.** `page` under the text (the chapter column, formulario, exercise lists); `bg` for chrome (header, TOC sider, library); `surface` for cards and formula blocks; `surface-raised` for hovers, fills and inline code; `surface-overlay` + `shadow-overlay` for popovers, menus, drawers; `code-bg` for code.
- **Text.** `ink` for book text and headings; `ink-muted` for captions, metadata, TOC paragraphs, inactive tabs; `ink-subtle` for numbers and placeholders. All three hold 4.5:1 on every ground in both themes.
- **Teal (`primary`).** The one primary button per view (Importa smartbook, Esegui), the reading-progress meter, checked controls. As text, `primary-text` (alias `link`) for links, cross-references and the active tab/TOC row, on `primary-soft`.
- **Gold (`star`).** Position only: the current-paragraph dot in `ChapterToc`, the bar in `ParagraphRail`, the logo ribbon. `star-text` on `star-soft` for hints (`hint`), the "con licenza" badge and medium difficulty.
- **Cobalt (`info`).** Pyxis' cobalt, used here as the solution colour (`solution` on `info-soft`) and the "importato" badge.
- **Status.** `success` (easy, finished run, valid import), `danger` (hard, errors, failed import). Always with a word or icon; `success` mint sits near teal in hue, so never rely on the colour to tell them apart.
- **Hairlines** are `border` and decorative. Anything the student operates (inputs, secondary buttons, reveal buttons, the dropzone) is outlined in `border-control` (3:1).
- **Focus:** 2px solid `focus-ring`, 2px offset, on every focusable element: teal on paper, gold on dark.
- **Plots:** `chart-1` (teal) for the studied function, `chart-2` (cobalt, dashed) for the second series, `chart-3` (gold) for a marked point, `chart-grid` gridlines, `border-control` axes. The dash keeps series apart without colour.

No gradients, no glows, no coloured left borders on cards.

## Typography

Three families, all OFL and bundled (nothing loads from the network):

- **Source Serif 4** (variable, optical sizes) for everything the student *reads*: `reading` 18/30 for chapter text and exercise questions, `reading-small` 16/26 for hints, solutions and card text, `caption` 14/20 italic for figure captions and formula labels. Set `font-variation-settings: 'opsz' <size>` to match the size (the `.t-*` classes do).
- **Figtree** for the interface and headings: `display` (library headline), `title-1` (chapter title), `title-2` (paragraph headings), `title-3` (card titles), `body`, `body-strong`, `small`.
- **JetBrains Mono** for data: `label` (UPPERCASE, 0.08em tracking), `meta` (numbers, ids), `code` 14/22 (code blocks and the lab).
- Math renders with **KaTeX** in its own fonts, display formulas at 19px, inline at 1.05em of the text.
- The reading column is `reading-width` (720px ≈ 68ch). Never set book text wider, never justify it, never set it in Figtree.
- Dyslexia-friendly mode (shared with Pyxis): `reading` gets `letter-spacing: 0.05em` and `line-height: 1.9`; the family stays.

## Layout

The reader is **ProLayout in `mix` mode**: a 64px header across the top, the chapter TOC sider on the left, the reading column in the middle, the paragraph rail on the right.

- Header (`ReaderHeader`): lockup left, `SectionTabs` centred (Capitoli, Formulario, Esercizi, Esami, Laboratorio, Grafici: only the sections the book enables), print and theme on the right. Below 1180px the tabs drop to icons; below 1024px the tabs move into the drawer and the book title appears in the header.
- Sider (`ChapterToc`, `sider-width` 280): the book (subject tag + title), then the chapters; the current chapter expands to its paragraphs. Below 1024px it becomes a left drawer opened by the `panel-left` button.
- Main: `space-12` top padding, content centred at `reading-width`; `ChapterHeader`, then paragraphs `space-12` apart, then `ChapterPager`. Grids (formulario, exercises, lab, graphs, library) use `wide-width` 1040.
- Rail (`ParagraphRail`, `rail-width` 208): from 1280px only; it replaces the old numbered paragraph buttons.
- Spacing is the Pyxis 4px scale: `space-1` … `space-16`. Radii: `radius-pill` for every action and tab, `radius-sm` tags and TOC rows, `radius-md` formula, reveal, figure, code frames, `radius-lg` cards, `radius-xl` dropzone and modals.
- Heights: `control-sm` 32 (reveal buttons, header icon buttons), `control-md` 40, `control-lg` 48 (pager).

## Elevation and motion

- Light: resting cards get `shadow-card`; the header gets `shadow-header` once scrolled. Dark: no card shadows, surface steps and `border` do the work.
- Only overlays (formula preview, menus, drawer, modals) get `shadow-overlay`.
- Motion is 150ms colour/background transitions and a 200ms drawer slide. Smooth scroll to paragraphs. Nothing else moves; respect `prefers-reduced-motion`.

## Iconography

- **Lucide** line icons at 1.75 stroke in `currentColor`, via `lucide-react` (the same set as Pyxis). No `@ant-design/icons`, no filled icons, no emoji.
- One icon per concept. Sections: Capitoli `book-open`, Formulario `sigma`, Esercizi `pencil-line`, Esami `graduation-cap`, Laboratorio `terminal`, Grafici `chart-line`. Actions: print `printer`, theme `moon`/`sun`, TOC `panel-left`, hint `lightbulb`, solution `circle-check`, hide `eye-off`, run `play`, reset `rotate-ccw`, import `upload`, `.ptsb` file `file-archive`, licensed `lock`, missing image `image`, error `circle-alert`.
- Sizes: 14–16 in tags and small buttons, 18–20 in controls and the header.
- The `Icons` asset group holds these as SVG files drawn in light `ink` (#15181e) for docs; in code always use `lucide-react`.

## Logo

The mark is an **open book with a bookmark**: three page edges fanning from the spine (ink at 50 / 70 / 90%, the same three-stroke rhythm as Pyxis' star trails) and a gold ribbon hanging from the spine, which is where you stopped reading.

- `ptsb-mark-light.svg` on light grounds (ink `#15181e`, ribbon `#b7790c`), `ptsb-mark-dark.svg` on dark (ink `#e8eaef`, ribbon `#f4b942`), `ptsb-mark-mono.svg` for one-colour print.
- Lockup: mark + "Smartbook" in Figtree 700 (outlined in the files). The header uses the `Logo` component with `wordmark` at 28px.
- Below 32px use the two-page `ptsb-mark-small-*` files; the `Logo` component switches by itself.
- App icon / favicon: white pages and gold ribbon on a teal `primary` square (`ptsb-app-icon.svg`, PNG 16–1024). Replace the old `public/logo.svg` and favicons with these.
- Clear space is half the mark's height. Never recolour the ribbon, add pages, or set the mark on a photo.

## Building with this system

- UI is **antd v6 + ProComponents v3** (`@ant-design/pro-components`), themed by `ptsbTheme(mode)` and `ptsbProLayoutToken(mode)` in `theme/ptsb-theme.ts`; the shell is `theme/ReaderShell.tsx`. Use `theme.useToken()` in antd code and `var(--token)` in custom CSS. Never hard-code a colour.
- Mapping: section tabs = `Segmented`; TOC = ProLayout `menu` (or `Menu` in a `Drawer` on mobile); paragraph rail = `Anchor`; formula preview = `Popover`; reveal blocks = custom (antd `Collapse` is too heavy); exercises = `Card`; difficulty = custom tag; library = `ProList`/`Card` grid; import = `Upload.Dragger`; lab output = custom; confirmations and toasts = `App.useApp()`.
- The custom components here (`PTSB.*`) are the spec: rebuild them as TSX with the same class names from `bundle.css`.
- Nothing may look like stock antd: default blue, grey Pro headers or the admin sidebar mean a token is missing.
