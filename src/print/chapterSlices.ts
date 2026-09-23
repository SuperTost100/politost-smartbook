/** Direct `[data-print-chapter]` children. One chapter (or none) keeps the whole flow. */
export function slicePrintChapters(flow: HTMLElement): HTMLElement[] {
  const chapters = [...flow.querySelectorAll(':scope > [data-print-chapter]')];
  if (chapters.length <= 1) return [flow];
  return chapters.map((chapter, index) => {
    const slice = flow.cloneNode(true) as HTMLElement;
    if (index > 0) slice.querySelector(':scope > .print-brand-block')?.remove();
    const id = chapter.getAttribute('data-print-chapter');
    for (const node of [...slice.querySelectorAll(':scope > [data-print-chapter]')]) {
      if (node.getAttribute('data-print-chapter') !== id) node.remove();
    }
    return slice;
  });
}

/**
 * Yield before each chapter so the toolbar can paint while pagination is running.
 * `preview` returns false to stop (route teardown).
 */
export async function paginateSlices<T>(
  slices: T[],
  preview: (slice: T) => Promise<boolean>,
  yieldPaint: () => Promise<void>,
): Promise<void> {
  for (const slice of slices) {
    await yieldPaint();
    const keepGoing = await preview(slice);
    if (!keepGoing) return;
  }
}
