/**
 * How far into a chapter a paragraph is, 0-100: 0 on the first paragraph, 100 on the last, so the
 * paragraph being read does not count as already read. A one-paragraph chapter counts as 100.
 */
export function chapterProgress(index: number, count: number): number {
  if (count <= 0 || index < 0) return 0;
  if (count === 1) return 100;
  return Math.round((Math.min(index, count - 1) / (count - 1)) * 100);
}
