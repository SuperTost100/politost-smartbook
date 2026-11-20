// The parser's own box scanner, from its modules: the package root does not export it.
import { boxEnd, hasBoxOpening, scanBoxes } from '../../packages/content-core/src/parser';
import { blankCode } from '../../packages/content-core/src/renderContent';

/** A numbered formula or a figure in a paragraph's text after preprocessContent: parseContentBlocks' own pattern. */
const BLOCK_MARKER = /<!--FORMULA:[\d.]+-->|<!--IMAGE:\{[\s\S]*?\}-->/g;

/**
 * Where a box starts and ends in the text, as character offsets: from its opening line to the line
 * after its closing `:::`, or after the proof attached to a theorem. Null when the text has no box.
 */
function boxRanges(content: string): [number, number][] | null {
  const blanked = blankCode(content);
  if (!hasBoxOpening(blanked)) return null;
  const lines = content.split('\n');
  const lineStart = [0];
  for (const line of lines) lineStart.push(lineStart.at(-1)! + line.length + 1);
  return scanBoxes(lines, blanked.split('\n')).map((span) => [lineStart[span.open], lineStart[boxEnd(span, lines.length)] - 1]);
}

/**
 * Cuts a paragraph's text into pieces of at least `minChars` characters, so a long paragraph can
 * appear a piece at a time. It cuts only where parseContentBlocks parses the text on each side on its
 * own: where a numbered formula or a figure begins, or where a box begins, and never inside a box or
 * between a theorem and the proof attached to it. So the blocks of the pieces, one after the other,
 * are the blocks of the whole text.
 */
export function splitContentPieces(content: string, minChars: number): string[] {
  // The parser reads \r\n as one line break: such a text stays in one piece rather than risk a cut it reads differently.
  if (content.includes('\r')) return [content];
  const boxes = boxRanges(content);
  const cuts = [...content.matchAll(BLOCK_MARKER)].map((match) => match.index);
  if (boxes) cuts.push(...boxes.map(([open]) => open));
  const inBox = (at: number) => boxes?.some(([open, end]) => at > open && at < end) ?? false;

  const pieces: string[] = [];
  let start = 0;
  for (const at of cuts.sort((a, b) => a - b)) {
    if (at === start || at - start < minChars || inBox(at)) continue;
    pieces.push(content.slice(start, at));
    start = at;
  }
  pieces.push(content.slice(start));
  return pieces;
}

/** A piece of a chapter: its paragraph and its place in that paragraph. */
export type PieceRef = readonly [paragraph: number, piece: number];

/** The boxes an element id prefix names (boxElementId in boxes.ts): lemmas and corollaries are theorems. */
const BOX_PREFIX: Record<string, string> = {
  definizione: 'definition',
  teorema: 'theorem',
  esempio: 'example',
  errore: 'mistake',
  osservazione: 'remark',
};

/**
 * The piece a link lands in: the start of a paragraph (`#p3`), the piece with a numbered formula
 * (`#formula-3.11`) or the piece with a box (`#teorema-3.2`). Null for any other hash.
 */
export function pieceForHash(pieces: string[][], paragraphIds: string[], hash: string): PieceRef | null {
  let id: string;
  try {
    id = decodeURIComponent(hash.replace(/^#/, ''));
  } catch {
    // A hash such as `#%` is not valid percent encoding.
    return null;
  }
  if (!id) return null;
  const paragraph = paragraphIds.indexOf(id);
  if (paragraph >= 0) return [paragraph, 0];
  const formula = /^formula-([\d.]+)$/.exec(id)?.[1];
  const box = /^([a-z]+)-([\d.]+)$/.exec(id);
  let holds: (piece: string) => boolean;
  if (formula) holds = (piece) => piece.includes(`<!--FORMULA:${formula}-->`);
  else if (box && BOX_PREFIX[box[1]]) {
    const opening = new RegExp(`^:::${BOX_PREFIX[box[1]]}\\{[^\\n]*\\bid="${box[2].replace(/\./g, '\\.')}"`, 'm');
    holds = (piece) => opening.test(piece);
  } else return null;
  for (const [i, list] of pieces.entries()) {
    const j = list.findIndex(holds);
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
