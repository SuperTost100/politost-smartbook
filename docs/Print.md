# Print Preview

Printable sections expose **Versione stampabile** in the UI.

## Routes

| Content | URL |
|---------|-----|
| Chapter | `/libro/<id>/stampa/capitolo/<chapter-id>` |
| Formulario | `/libro/<id>/stampa/formulario` |
| Exercises | `/libro/<id>/stampa/esercizi` |
| Exams | `/libro/<id>/stampa/esami` |

Requires `printable: true` on the chapter or exercise frontmatter.

## Implementation

- Shell + toolbar: `src/print/PrintPage.tsx`
- Paged.js runs inside an **iframe** (style isolation)
- Shared text rendering: `ContentFlow variant="print"`

Lab and graphs are **not** printable.

## Tests

```bash
npm run test:print    # 5 Playwright tests
npm run test:print:unit
```

Print CSS lives in `src/print/styles/` (tokens, document layout, `@page` rules).
