# PoliTost Smartbook design system — components

Custom components and their rules. Live versions: `reference/index.html` (open it offline; toggle the theme top right). `reference/bundle.css` is the styling reference; class names start with `sb-`.

## Logo

The Smartbook mark: an open book with a gold bookmark ribbon, alone or with the "Smartbook" wordmark.

**Consumer provides** `size` (px, default 28) and `wordmark` to add "Smartbook" in Figtree 700.

- Pages draw in `ink`, the ribbon in `star`; both follow the theme. Never recolour the ribbon.
- Below 32px the component switches to the two-page small mark.
- Header: `wordmark` at 28px. Book cards: mark alone at 44px.
- antd: pass it as ProLayout `logo`, with `title={false}`.

## Icon

Lucide line icon at a 1.75 stroke in `currentColor`.

**Consumer provides** `name` (a Lucide id), optional `size` (default 20), `strokeWidth`, and `label` when the icon stands alone.

- In the app use `lucide-react` (`<Sigma size={16} strokeWidth={1.75} />`); this component mirrors it for previews.
- Section icons: `book-open`, `sigma`, `pencil-line`, `graduation-cap`, `terminal`, `chart-line`. See the brand book for the full map.
- Icons take their text's colour; a status colour only next to a status word.

## Button

Pill action button; antd `Button` with `shape="round"`.

**Consumer provides** the label, `variant` (`primary` | `secondary` | `ghost` | `danger`), `size` (`sm` 32 | `md` 40 | `lg` 48), optional `icon` / `iconEnd`, `block`, `href`.

- One `primary` per view: Importa smartbook in the library, Esegui in the lab. Everything in the reader itself is `secondary` or `ghost`.
- Reveal buttons and card actions are `sm`; the chapter pager and the library call to action are `lg`.
- `danger` only to remove a book from the library, behind a confirm.
- antd: `type="primary"`, `type="default"`, `type="text"`, `danger`, all `shape="round"`.

## IconButton

Circular icon-only button for the header, the lab toolbar and card actions.

**Consumer provides** `icon`, `label` (required: aria-label and tooltip), optional `variant` (default `ghost`), `size`.

- Only for well-known actions: index `panel-left`, print `printer`, theme `moon`/`sun`, close `x`.
- antd: `<Button shape="circle" type="text" icon={…} aria-label="…" />` with a `Tooltip`.

## Tag

Small mono label for the subject and a book's origin.

**Consumer provides** the text, `tone` (`neutral` | `subject` | `uploaded` | `licensed` | `outline`) and an optional `icon`.

- `subject` is uppercase teal on `primary-soft` (FISICA); `uploaded` cobalt with `upload`; `licensed` gold with `lock`; `outline` for languages in the lab (python, matlab).
- Lowercase text except `subject`. Replaces the old subject badges and per-subject accent colours: subjects are told apart by name, not colour.
- antd: `<Tag bordered={false}>` with the tone colours from the theme.

## DifficultyTag

Exercise difficulty as a three-step bar signal plus the word.

**Consumer provides** `level` (`facile` | `medio` | `difficile`), optionally a translated label as children.

- One, two or three bars filled, so it reads in greyscale and print.
- `facile` success, `medio` gold, `difficile` danger, each on its soft fill.
- Sits at the right of the ExerciseCard header.

## SectionTabs

Pill tab switcher with UPPERCASE mono labels for the book's sections.

**Consumer provides** `items` (`{value, label, icon?}`; the section keys `smartbook`, `formulario`, `esercizi`, `esami`, `ide`, `grafici` get their icons automatically), `value`, `onChange`, `compact` for icons only, and an accessible `label`.

- Show only the sections the book enables in `smartbook.json`, in that order.
- The active tab is `primary-soft` with `primary-text` (Pyxis uses an ink pill; the teal tint is the Smartbook difference).
- In the header it goes compact below 1180px and into the drawer below 1024px.
- antd: `<Segmented shape="round" options={…} />` themed through the `Segmented` block in `ptsb-theme.ts`; each option is a route link.

## ReaderHeader

The 64px reader header: lockup, section tabs, print and theme.

**Consumer provides** `sections` and `active` (for SectionTabs), `onSection`, `theme` and `onTheme`, optional `onPrint`, `onMenu` (shows the TOC button), `title` and `subject` (shown only below 1024px, when the sider is a drawer), `homeHref`.

- Sits on `bg` with a `border` hairline; `shadow-header` once the page scrolls.
- The book title lives in the TOC sider on desktop, so the tabs stay centred.
- antd: ProLayout `layout="mix"` header: `logo`, `headerContentRender` for the tabs, `actionsRender` for the buttons.

## ChapterToc

The left sider: the book, then its chapters, with the current chapter expanded to its paragraphs.

**Consumer provides** `subject`, `bookTitle`, `chapters` (`{id, number, title, href?, paragraphs?}`), `activeChapter`, `activeParagraph`, optional `title` (default "Indice").

- The current chapter row is `primary-soft` with `primary-text`; the current paragraph is `ink` bold with a gold `star` dot. That dot follows the scroll.
- Chapter numbers are mono `ink-subtle`; titles never truncate, they wrap.
- Width `sider-width`; below 1024px it lives in a left `Drawer`.
- antd: ProLayout `menu` with chapters as items and paragraphs as children, or `Menu mode="inline"` in the drawer.

## ParagraphRail

Right-hand list of the chapter's paragraphs with the current one marked and a reading meter.

**Consumer provides** `items` (`{id, number, title}`), `active`, `onJump`, optional `progress` (0–100) and `title`.

- Replaces the old row of numbered paragraph buttons: it shows titles, so the student knows where a jump goes.
- The current item gets a 3px gold bar on the hairline track. The meter is teal `primary`.
- Visible from 1280px; sticky under the header.
- antd: `<Anchor items={…} targetOffset={88} />` restyled, with a `Progress` below.

## ChapterHeader

The top of a chapter: eyebrow, title, reading facts and the print action.

**Consumer provides** `number`, `title`, optional `paragraphs`, `minutes`, `onPrint` (only when the chapter is `printable`), `eyebrow` (default "Capitolo").

- Title in `title-1`, eyebrow in `label`. Replaces the old "Cap. 2 — Titolo" toolbar.
- The print button is `secondary sm`; it opens the Paged.js print preview.

## ParagraphHeading

A paragraph heading from `## p1 | Title`, with its number and a hover anchor.

**Consumer provides** `number` (chapter.paragraph, e.g. `2.2`), `id` (the paragraph id, used by the TOC and rail), and the title as children.

- `title-2` in Figtree with the number in `meta` mono `ink-subtle`.
- Paragraphs are `space-12` apart; the heading scrolls to `header-height` + `space-6` from the top.

## Prose

Rendered chapter markdown in the serif reading style.

**Consumer provides** sanitized `html` (from ContentFlow) or children.

- `reading` 18/30 Source Serif 4, `ink` on `page`, max `reading-width`.
- Links and `ref:` cross-references use `link`, underlined 1px. Inline code in mono on `surface-raised`. Lists use `ink-subtle` markers. `<mark>` uses `star-soft` for search hits.
- Inline KaTeX sits at 1.05em. Don't set any other font inside prose.

## Formula

A numbered display formula from `:::formula{id label}`.

**Consumer provides** `latex`, `number` (e.g. `2.1`), optional `label`.

- `surface` card, `radius-md`, math centred at 19px, number right as a teal chip, label centred below in `caption`.
- Its id `f-<number>` is the target of FormulaRef and the formulario.
- Wide formulas scroll horizontally inside the card, never the page.

## FormulaRef

Inline reference to a numbered formula (`{{formula:2.1}}`) that previews it on hover or focus.

**Consumer provides** `number`, `label`, `latex`, and `onOpen` to jump to the formulario.

- The chip reads "(2.1)" in mono `link`; hover or keyboard focus opens a `surface-overlay` popover with the formula and "Apri nel formulario".
- Replaces the old mouse-only tooltip: it must open on focus too.
- antd: `<Popover trigger={['hover','focus']}>` around a text `Button`.

## Figure

An image from `:::image{src alt caption}` with a numbered caption.

**Consumer provides** `src` and `alt` (or an SVG as children), `caption`, `number`, or `missing` when the asset can't be resolved.

- Framed on `surface` with a `border` hairline so transparent SVGs read in dark mode.
- Caption: "Fig. 2.1" in `meta` mono, then the text in `caption` italic serif.
- A missing asset shows the path and an `image` icon, never a broken image.

## RevealBlock

A hint or solution that stays closed until the student asks.

**Consumer provides** `variant` (`hint` | `solution`), the content (children), optional `defaultOpen`, `label`, `showLabel`.

- Closed: a `secondary sm` pill, "Mostra suggerimento" (`lightbulb`) or "Mostra soluzione" (`circle-check`).
- Open: `star-soft` (hint) or `info-soft` (solution) panel with an uppercase label, `reading-small` text and a "Nascondi" button.
- In print both are shown open. No coloured left borders.

## ExerciseCard

An exercise or exam question with its id, chapter, difficulty, hint and solution.

**Consumer provides** `id` (E2.3), `chapter`, `difficulty`, the question (children), optional `hint` and `solution` content.

- `surface` card, `radius-lg`, `space-6` padding; question in `reading`.
- Header: id in mono bold, chapter in `meta`, DifficultyTag on the right.
- Cards stack `space-6` apart at `reading-width`; the exercises page has one `secondary` print action at the top.

## FormulaCard

One chapter of the formulario: numbered formulas with their labels.

**Consumer provides** `chapter`, `title`, `items` (`{number, label, latex, href?}`).

- Each row links back to the formula in its chapter (`#f-<number>`); rows highlight on hover.
- Three columns: number (mono teal), label (`body`), formula (KaTeX 16px, left aligned). Stack the label over the formula below 640px.
- Cards stack `space-6` apart at `wide-width`.

## CodeCell

A lab snippet from `ide.json`: editor, run, output.

**Consumer provides** `title`, `language` (`python` | `matlab`), `description`, `code`, `status` (`idle` | `running` | `ok` | `error`), `output`, `onRun`, `onReset`.

- Header: title, language tag (outline), Ripristina (ghost) and Esegui (the page's one `primary`).
- The editor is Monaco on `code-bg` in `code` 14/22 with a line gutter; keep the Monaco theme in sync with the tokens.
- Output says its status in words and an icon; errors switch the panel to `danger-soft`.

## GraphPanel

A plot from `grafici.json` with its title, graph switcher and legend.

**Consumer provides** `title`, optional `tabs` / `activeTab` to switch graphs, `series` (`{label, fn}` for function plots), `domain`, `range`, `points` to mark.

- In the app the plot is Plotly: set `paper_bgcolor`/`plot_bgcolor` to `surface`, grid `chart-grid`, axes `border-control`, font JetBrains Mono 11px `ink-subtle`, series `chart-1`…`chart-3`.
- The second series is dashed so the legend works without colour.
- The legend shows the expressions in mono.

## BookCard

A book in the library: subject, origin badges, title, contents and Apri.

**Consumer provides** `subject`, `title`, `meta` (e.g. "8 capitoli · formulario · 64 esercizi"), `uploaded`, `licensed`, `href` or `onOpen`, optional `onRemove` for imported books.

- Cover band on `surface-raised` with the tags and the mark; no per-subject colours.
- Only the Apri button and the remove button act; the card is not one big link.
- Grid of 2–3 columns at `wide-width`, `space-4` gutter.

## ImportDropzone

The `.ptsb` import area in the library.

**Consumer provides** `state` (`idle` | `drag` | `success` | `error`), `message` for success/error, `onPick`, optional `title` and `hint`.

- Dashed `border-control`, `radius-xl`. Dragging over turns it `primary-soft` with a teal border.
- Success and error appear inside it as a status line with icon and sentence ("File non valido: manca smartbook.json.").
- Say that the file stays in the browser.
- antd: `<Upload.Dragger accept=".ptsb" showUploadList={false}>` restyled.

## ChapterPager

Previous / next chapter links at the end of a chapter.

**Consumer provides** `prev` and `next` (`{number, title, href}`), either may be missing.

- Two outlined `radius-lg` blocks at `reading-width`, `space-12` below the text.
- Intentional addition: the old reader had no way to continue except the TOC.

## Reader

The reading view composed: header, TOC sider, chapter column, paragraph rail.

**Consumer provides** `header` (ReaderHeader), `toc` (ChapterToc), `rail` (ParagraphRail) and the chapter content as children.

- Grid: `sider-width` | fluid main | `rail-width`, under the 64px header. Main content centred at `reading-width` with `space-12` top padding.
- Below 1280px the rail hides; below 1024px the sider becomes a drawer.
- In the app this is `ReaderShell.tsx` (ProLayout `mix`), not this component.
