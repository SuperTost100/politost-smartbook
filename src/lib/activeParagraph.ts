interface ParagraphIntersection {
  isIntersecting: boolean;
  target: { getBoundingClientRect(): { top: number } };
}

/**
 * The paragraph the reader is on. A heading inside the band wins, and the
 * first of those wins, so a later paragraph that merely fits on screen does
 * not take over. Entry order does not matter. If every intersecting paragraph
 * started above the band, the latest of those is the one still on screen.
 */
export function closestIntersectingParagraph<T extends ParagraphIntersection>(
  entries: readonly T[],
  bandTop: number,
  bandBottom: number,
): T | undefined {
  let inBand: T | undefined;
  let inBandTop = Infinity;
  let above: T | undefined;
  let aboveTop = -Infinity;
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    const top = entry.target.getBoundingClientRect().top;
    if (top >= bandTop && top <= bandBottom) {
      if (top < inBandTop) {
        inBand = entry;
        inBandTop = top;
      }
    } else if (top < bandTop && top > aboveTop) {
      above = entry;
      aboveTop = top;
    }
  }
  return inBand ?? above;
}
