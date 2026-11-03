# PoliTost Smartbook design system: foundations

Smartbook looks like **paper objects on a desk**. This direction is called Carta, and Tost picked it on 2026-11-03 from the three mockups in `mockups/`. Controls are raised out of the desk and press in when they are on. The text sits on a sheet of paper, and every book has a matte cover with a line drawing of its subject. The accent is terracotta. Smartbook has its own identity, so it no longer shares Pyxis' teal, mono labels or pills.

The reference for every screen is `mockups/b-carta.html` (library, chapter, exercises, light and dark, desktop and phone).

## Principles

- **The text comes first.** The chapter is the calmest thing on screen: serif `reading` on the `page` sheet, at most 76ch wide, with nothing animated next to it. The desk, the header and the panels stay quieter than the sheet.
- **Raised means you can use it, pressed means it is on.** Buttons, tiles and the active tab are raised (`raised`, `raised-sm`). Tracks, wells, the TOC panel and an active control are pressed (`pressed`, `pressed-lg`). Never raise something that does nothing.
- **Always show where you are.** The ribbon colour (`star`) marks position and nothing else: the current paragraph dot, the reading meter, the bookmark on the cover of the book being read and in the logo.
- **Numbers are addresses.** Paragraphs (2.2), formulas (2.1), exercises (E2.3) and figures (Fig. 2.1) always show their number, in tabular figures, often in a small raised badge.
- **Reveal, don't spoil.** Hints and solutions stay closed until asked and can be closed again.
- **Local and honest.** Imported `.ptsb` files stay in the browser. Status and errors are plain sentences with the fix.

## Content

- Italian first. Italian runs about 20% longer than English, so every label needs room for it.
- Address the student as **tu** ("Trascina qui il file .ptsb", "L’ultima volta eri al paragrafo 2.2"), and keep copy free of gendered forms ("eri al paragrafo", not "ti eri fermato").
- Sentence case everywhere, including kickers and panel labels ("Continua a leggere", "In questo capitolo"). There is no uppercase style any more.
- Short and concrete: "8 paragrafi", "circa 60 min", "24 % del capitolo". Put a space before %, as Italian typography wants.
- No emoji, no exclamation marks, no hype.

## Colour

Light (the desk) is the primary theme, and dark (clay) is fully designed. Set `data-theme="light|dark"` on `<html>`. The reader follows the system setting until the student toggles it. Every value lives in `tokens/tokens.json`.

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `bg` | `#e8e0d3` | `#26211d` | The desk: page ground and reader header |
| `surface` | `#efe8dc` | `#2c2622` | Raised objects: header bar, tiles, cards, buttons |
| `surface-raised` | `#e1d8c9` | `#1f1b18` | Wells: tracks, the TOC panel, chips, meters, the import tray |
| `page` | `#fbf8f2` | `#312a25` | Paper: the chapter sheet, figures, plots |
| `ink` / `ink-muted` / `ink-subtle` | `#2f2620` / `#5b4e43` / `#62554a` | `#eee4d6` / `#c8b9a7` / `#a99a88` | Text; all three hold 4.5:1 on every ground |
| `primary` | `#a9472a` | `#e08a62` | Terracotta: one primary button per view, checked controls |
| `primary-text` | `#9a3f24` | `#eb9670` | Links, kickers, the active tab, numbers in badges |
| `star` | `#b8592a` | `#f2c48a` | The ribbon: position marks only |

- **Shadows carry the depth.** `raised`, `raised-sm`, `pressed`, `pressed-lg` and `pressed-sm` mix `shade` and `highlight`, the two shadow colours of each theme. `shadow-paper` is for the sheet and `shadow-overlay` for popovers, menus, modals and the drawer.
- **Hints and solutions.** A hint is `star-text` on `star-soft`, a solution `success` on `success-soft`.
- **Status.** `success` for easy and finished, `star-text` for medium, `primary-text` for hard, `danger` for errors. Always with a word or an icon.
- **Covers.** Seven matte colours (`color.covers` in the tokens): terracotta, sage, slate, plum, teal, moss and ochre. `subjectLook()` in `src/lib/subjectLook.ts` picks one per subject, and ochre stays for the example guide. Cover text holds 4.5:1 on every cover.
- **Focus.** A 2px `focus-ring` outline with a 3px offset on everything focusable.
- **Plots.** `chart-1` (terracotta text colour), `chart-2` (slate), `chart-3` (ribbon), on `page`.

Keep every text pair at 4.5:1 and every control edge, focus ring and mark at 3:1, in both themes.

## Typography

Three families, all OFL and bundled, so nothing loads from the network:

- **Newsreader** (variable, optical sizes) for headings and everything the student reads. `display` 56/60 for the resume title, `title-1` 44/48 for chapter and section titles, `title-2` 30/36 for paragraph headings, `title-3` 19/25 for card titles, `reading` 19/32 for chapter text and `reading-small` 17/27 for hints and solutions. Optical size follows the font size automatically.
- **Hanken Grotesk** for the interface: `body` 16/24, `body-strong`, `small` 14/20, `label` 13/16 at weight 600 for kickers and panel titles, and `meta` with tabular figures for numbers.
- **JetBrains Mono** for code only: code blocks, the lab editor and its output.
- Math renders with **KaTeX** in its own fonts.
- Book text never goes wider than 76ch, is never justified and is never set in the sans.

## Layout

The reader has a sticky header on the desk, the chapter index in an inset panel on the left, the paper sheet in the middle and the paragraph outline on a raised card on the right. `src/components/shell/ReaderShell.tsx` builds it with CSS grid and no layout library.

- **Header** (`header-height` 70): the mark (back to the library) and the book title, the section switcher in the centre, print and theme on the right. Between 1024 and 1239px the switcher shows icons only.
- **Index** (`ChapterToc`, `sider-width` 270, 240 below 1240px): the chapters, with the open one raised and its paragraphs listed under it.
- **Sheet**: the chapter on `page`, at most `reading-width` 920 wide, with two sheets drawn under it. The text inside stops at 76ch. Formulario, exercises, lab and graphs have no sheet and put their cards on the desk instead.
- **Outline** (`ParagraphRail`, `rail-width` 230): from 1360px only, with the current paragraph pressed in and a reading meter.
- **Below 1024px** the index moves into a drawer (the menu button), and the section switcher becomes a raised bar at the bottom of the screen.
- **Library**: a floating raised header, the resume panel (or the introduction when nothing has been read), the book tiles in an auto-fill grid (two columns on phones), and the inset import tray.
- Spacing uses the 4px scale `space-1` to `space-16`. Radii run from `radius-xs` (the sheet) to `radius-2xl` (the resume panel). Controls are `control-sm` 38, `control-md` 46, `control-lg` 52 and `control-icon` 42.

## Motion

- 150 to 200ms ease-out transitions on colour, background and shadow, and the drawer slide. A pressed control swaps its shadow when pressed, not on release.
- Smooth scroll to paragraphs. Nothing else moves, and `prefers-reduced-motion` turns transitions off.

## Icons

- **Lucide** line icons at a 1.75 stroke in `currentColor`, through `lucide-react`. No `@ant-design/icons`, no filled icons, no emoji.
- Sections: Capitoli `book-open`, Formulario `sigma`, Esercizi `pencil-line`, Prove d'esame `graduation-cap`, Laboratorio `terminal`, Grafici `chart-line`. Actions: print `printer`, theme `moon`/`sun`, index `menu`, hint `lightbulb`, solution `circle-check`, hide `eye-off`, import `upload`, licensed `lock`.

## Logo

The mark is an **open book with a ribbon**: three page strokes fanning from the spine at 50, 70 and 90% ink, and the ribbon hanging from it where you stopped reading. The shape is the one from v1, recoloured.

- In the app, `Mark` and `Lockup` in `src/components/shell/Lockup.tsx` draw it inline, with the pages in `currentColor` and the ribbon in `star`, so they follow the theme.
- The lockup sets "Smartbook" in Newsreader 600. The files in `logo/` have it outlined.
- The app icon is cream pages and a pale ribbon on a terracotta tile with 22% corner radius. `public/` holds the favicons and PWA icons made from it.
- Clear space is half the mark's height. Never recolour the ribbon, add pages or set the mark on a photo.
