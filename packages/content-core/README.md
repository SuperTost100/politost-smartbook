# @politost/content-core

Parser, renderer, and validator for Politost Smartbook markdown.

Extracted from the viewer (Phase A rewrite). Consumed by `politost-smartbook` via workspace path `file:../packages/content-core`.

## Test

```bash
npm test
```

## Exports

- `parseChapterMarkdown`, `parseExercises`, `preprocessContent`
- `parseContentBlocks`, `parseInlineSegments`, `renderLatexInText`
- `renderFormulaLatex`, `renderNumberedFormulaHtml`
- `validateChapter`, `validateBundle`
- Types in `types/smartbook.ts`
