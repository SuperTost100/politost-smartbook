# Logo

The Smartbook mark: an open book (three page strokes at 50, 70 and 90% ink) with a ribbon hanging from the spine.

- `ptsb-mark-light.svg`: ink `#2f2620`, ribbon `#b8592a`, for the light desk and paper.
- `ptsb-mark-dark.svg`: ink `#eee4d6`, ribbon `#f2c48a`, for the dark theme.
- `ptsb-mark-mono.svg`: solid black, for one-colour print.
- `ptsb-mark-small-light.svg` and `-dark.svg`: two thicker pages, for 16 to 31px.
- `ptsb-lockup-light.svg` and `-dark.svg`: the mark and "Smartbook" in Newsreader 600, outlined. The artboard is 72px tall; use it at 28 to 36px.
- `ptsb-app-icon.svg`: cream pages and a pale ribbon on a terracotta `#a9472a` tile with 22% corner radius, for PWA and store icons. `ptsb-app-icon-small.svg` is for sizes below 32px.
- PNG app icons at 1024, 512, 256 and 128 (full mark) and 64, 32 and 16 (small mark).

In the app, `Mark` and `Lockup` in `src/components/shell/Lockup.tsx` draw the mark inline so it follows the theme. `public/` holds the favicons and PWA icons made from the app icon.
