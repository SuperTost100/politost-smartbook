/**
 * Links inside a printed document. Index entries and the links between an exercise and its
 * solution point at targets that are always printed, so they get their href when they render.
 * References in the text (`formula/7.11`, `chapter/3#p2`) depend on which chapters, formula sheet
 * and exercises the options print: they render as `<a data-print-ref>` without an href, and
 * linkPrintRefs gives each one an href once the document is complete, or leaves it as plain text
 * when its target is not printed.
 */

/** Element ids in the print document. A formula has one id per place, so a chapter equation and its formula-sheet card never share one. */
export const printIds = {
  chapter: (n: number) => `cap-${n}`,
  paragraph: (n: number, paragraphId: string) => `cap-${n}-${paragraphId}`,
  /** The equation in its own chapter, given by linkPrintRefs to its first occurrence there. */
  equation: (formulaId: string) => `eq-${formulaId}`,
  /** The formula-sheet card. */
  formulaCard: (formulaId: string) => `formula-${formulaId}`,
  chapterExercises: (n: number) => `esercizi-${n}`,
  otherExercises: 'esercizi-altri',
  formulario: 'formulario',
  exams: 'esami',
  exercise: (prefix: string, exerciseId: string) => `${prefix}-${exerciseId}`,
  solution: (prefix: string, exerciseId: string) => `${prefix}-${exerciseId}-soluzione`,
};

/** `href` for an id; `#` plus the encoded id, which the browser decodes before matching. */
export function hrefTo(id: string): string {
  return `#${encodeURIComponent(id)}`;
}

/**
 * Where a ref may land, best first: a formula goes to its equation in its chapter, then to its
 * formula-sheet card; a paragraph goes to the paragraph, then to the start of its chapter.
 */
export function refTargets(ref: string): string[] {
  const formula = /^formula\/([\d.]+)$/.exec(ref);
  if (formula) return [printIds.equation(formula[1]), printIds.formulaCard(formula[1])];
  const paragraph = /^chapter\/(\d+)#(p\d+)$/.exec(ref);
  if (paragraph) {
    const n = Number(paragraph[1]);
    return [printIds.paragraph(n, paragraph[2]), printIds.chapter(n)];
  }
  return [];
}

/** The first target of `ref` that the document has, or null. */
export function resolveRef(ref: string, has: (id: string) => boolean): string | null {
  return refTargets(ref).find(has) ?? null;
}

/**
 * One pass over a complete print document, with no layout reads. First each formula's first
 * equation inside its own chapter (`[data-print-chapter-n]`) gets the equation id, and any later
 * copy loses it. Then every `a[data-print-ref]` gets the href of its target, or loses its href
 * when the target is not printed, so the PDF has no dead links.
 */
export function linkPrintRefs(root: ParentNode): void {
  const ids = new Set<string>();
  for (const el of root.querySelectorAll<HTMLElement>('.numbered-formula[data-formula-id]')) {
    const formulaId = el.dataset.formulaId!;
    const id = printIds.equation(formulaId);
    const chapter = el.closest<HTMLElement>('[data-print-chapter-n]')?.dataset.printChapterN;
    if (chapter !== undefined && chapter === el.dataset.formulaChapter && !ids.has(id)) {
      ids.add(id);
      if (el.id !== id) el.id = id;
    } else if (el.id) {
      el.removeAttribute('id');
    }
  }
  for (const el of root.querySelectorAll('[id]')) ids.add(el.id);

  for (const a of root.querySelectorAll<HTMLAnchorElement>('a[data-print-ref]')) {
    const target = resolveRef(a.dataset.printRef!, (id) => ids.has(id));
    if (target) {
      const href = hrefTo(target);
      if (a.getAttribute('href') !== href) a.setAttribute('href', href);
    } else if (a.hasAttribute('href')) {
      a.removeAttribute('href');
    }
  }
}

/** The element an in-document `#…` href points at, inside `root`; null for any other href. */
export function inDocumentTarget(root: HTMLElement, href: string | null): HTMLElement | null {
  if (!href?.startsWith('#') || href.length < 2) return null;
  let id: string;
  try {
    id = decodeURIComponent(href.slice(1));
  } catch {
    return null;
  }
  const el = root.ownerDocument.getElementById(id);
  return el && root.contains(el) ? el : null;
}
