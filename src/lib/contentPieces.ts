/** A numbered formula or a figure in a paragraph's text after preprocessContent: parseContentBlocks' own pattern. */
const BLOCK_MARKER = /<!--FORMULA:[\d.]+-->|<!--IMAGE:\{[\s\S]*?\}-->/g;

/**
 * Cuts a paragraph's text into pieces of at least `minChars` characters, so a long paragraph can
 * appear a piece at a time. It cuts only where a numbered formula or a figure begins:
 * parseContentBlocks parses the text between two of those on its own, so the blocks of the pieces,
 * one after the other, are the blocks of the whole text.
 */
export function splitContentPieces(content: string, minChars: number): string[] {
  const pieces: string[] = [];
  let start = 0;
  for (const match of content.matchAll(BLOCK_MARKER)) {
    if (match.index === start || match.index - start < minChars) continue;
    pieces.push(content.slice(start, match.index));
    start = match.index;
  }
  pieces.push(content.slice(start));
  return pieces;
}

/** A piece of a chapter: its paragraph and its place in that paragraph. */
export type PieceRef = readonly [paragraph: number, piece: number];

/**
 * The piece a link lands in: the start of a paragraph (`#p3`) or the piece with a numbered formula
 * (`#formula-3.11`). Null for any other hash.
 */
export function pieceForHash(pieces: string[][], paragraphIds: string[], hash: string): PieceRef | null {
  const id = decodeURIComponent(hash.replace(/^#/, ''));
  if (!id) return null;
  const paragraph = paragraphIds.indexOf(id);
  if (paragraph >= 0) return [paragraph, 0];
  const formula = /^formula-([\d.]+)$/.exec(id)?.[1];
  if (!formula) return null;
  const marker = `<!--FORMULA:${formula}-->`;
  for (const [i, list] of pieces.entries()) {
    const j = list.findIndex((piece) => piece.includes(marker));
    if (j >= 0) return [i, j];
  }
  return null;
}

/**
 * The order the pieces appear in: from the landing on to the end of the chapter, then the pieces
 * above it, the nearest first.
 */
export function mountOrder(pieces: string[][], from: PieceRef | null): PieceRef[] {
  const all: PieceRef[] = pieces.flatMap((list, i) => list.map((_, j) => [i, j] as const));
  const start = from ? Math.max(0, all.findIndex(([i, j]) => i === from[0] && j === from[1])) : 0;
  return [...all.slice(start), ...all.slice(0, start).reverse()];
}
