interface ParagraphIntersection {
  isIntersecting: boolean;
  target: { getBoundingClientRect(): { top: number } };
}

/** Chooses the paragraph nearest the viewport top, regardless of observer entry order. */
export function closestIntersectingParagraph<T extends ParagraphIntersection>(entries: readonly T[]): T | undefined {
  let closest: T | undefined;
  let top = Infinity;
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    const candidateTop = entry.target.getBoundingClientRect().top;
    if (candidateTop < top) {
      closest = entry;
      top = candidateTop;
    }
  }
  return closest;
}
