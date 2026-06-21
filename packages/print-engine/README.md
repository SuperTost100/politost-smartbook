# @politost/print-engine

Paged.js print preview for Politost Smartbooks — iframe pagination, print bodies, document CSS.

Depends on `@politost/content-core`. The viewer keeps platform-specific shell (`PrintPage.tsx`, `shell.css`, auth/watermark).

## Test

```bash
npm test
```

## Exports

- `PrintApp`, `PrintFrame`, `PrintChapter`, `PrintFormulario`, `PrintExercises`
- `PrintContentFlow` — print-only content renderer (no screen variant)
- `pagedRunner` — iframe Paged.js lifecycle
- `buildPrintUrl`, `getReturnUrl`, print route helpers
- CSS tokens: `PRINT_DOCUMENT_CSS`, `PRINT_PAGED_CSS`

## CSS contract

| File | Role |
|------|------|
| `styles/tokens.css` | Print design tokens |
| `styles/document.css` | Book typography inside iframe |
| `styles/paged.css` | Paged.js margin boxes |

Shell chrome (toolbar, loading screen) stays in the viewer: `politost-smartbook/src/print/styles/shell.css`.
