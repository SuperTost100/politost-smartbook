# Ant Design in Smartbook

Smartbook keeps **antd v6** for forms and overlays and draws everything else itself. The reader shell used to be Ant Design Pro's `ProLayout`, and Carta replaced it with a CSS grid in `src/components/shell/ReaderShell.tsx`, so `@ant-design/pro-components` is no longer a dependency.

## Why antd stays

antd covers about a tenth of the interface: the account forms, modals, the drawer, popovers, tooltips, the privacy switches and the `.ptsb` upload. Every alternative (Radix or shadcn, React Aria, Base UI, Mantine) would need the same restyling in the same files, plus a rebuilt form layer. ProLayout was the part that cost the most, because it was a beta pin with theme colours baked into unscoped selectors, and it is gone.

If a single overlay ever needs behaviour antd lacks, Base UI or React Aria can replace that one component without touching the rest.

## What uses antd

| Need | antd component | Where |
| --- | --- | --- |
| Theme, locale, `modal` and `message` | `ConfigProvider`, `App` | `src/context/AntdProvider.tsx` |
| Sign-in, sign-up, redeem and terms forms | `Form`, `Input`, `Checkbox`, `Alert`, `Button` | `src/pages/` |
| Confirm before removing a book | `App.useApp().modal.confirm` | `src/pages/Home.tsx` |
| Chapter index on phones | `Drawer` | `ReaderShell` |
| Formula preview | `Popover` | `FormulaRef` |
| Tooltips on icon buttons | `Tooltip` | `ReaderShell`, `ThemeToggle` |
| Privacy preferences | `Modal`, `Switch`, `Button` | `PrivacyControls` |
| `.ptsb` import | `Upload.Dragger` | `ImportDropzone` |

Section tabs, the index, the outline, buttons, chips and meters are plain elements styled in `ds.css`, so they need no antd overrides.

## Theme

`ptsbTheme(mode)` in `theme/ptsb-theme.ts` maps the tokens onto antd's seed, map and component tokens. Its colours, shadows and font stacks come from `theme/ptsb-tokens.ts`, which `npm run tokens` generates from `tokens/tokens.json`.

- `cssVar` prefix `sb` and `hashed: false`, so antd writes `--sb-*` variables next to the design tokens.
- Default buttons are raised paper (`surface` with `raised-sm`), and primary buttons are terracotta.
- Inputs sit on `page` with a `border-control` edge.
- Overlays use `surface-overlay` and `shadow-overlay`. `ds.css` gives modals a hairline and a serif title.

## Rules

- Nothing may look like stock antd. A default blue, a grey header or a dark admin sidebar means a token is missing.
- Never set colours inline: use `var(--token)` in CSS and `ptsbColors` only where JavaScript needs a raw value (Monaco, Plotly).
- Icons come from `lucide-react` at `strokeWidth={1.75}`. Do not add `@ant-design/icons`.
