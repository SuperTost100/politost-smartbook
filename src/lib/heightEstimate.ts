/** Room for a paragraph's heading, with its margin. */
export const HEADING_HEIGHT = 61;

const count = (text: string, re: RegExp) => text.match(re)?.length ?? 0;

/**
 * How tall a stretch of chapter text (after preprocessContent) will be in a column `width` pixels
 * wide, before the browser lays it out. The coefficients come from the paragraphs of Fisica 1 and
 * Analisi Matematica 2 measured at 322, 600 and 732 pixels, and the estimate lands within about
 * 5% of the real height. The page uses it for paragraphs it has not laid out yet, so the scrollbar
 * and a jump to a later paragraph are close to right before the text above is on screen.
 */
export function estimateTextHeight(content: string, width: number): number {
  const display = count(content, /\$\$/g) / 2;
  const formulas = count(content, /<!--FORMULA:/g);
  const images = count(content, /<!--IMAGE:/g);
  // A box (content format 1.3) adds its margins, padding and label line; its `:::` lines are not text.
  const boxes = count(content, /^:::(?:definition|theorem|proof|example|mistake|remark)\b/gm);
  const blocks = content.split(/\n\s*\n/).filter((block) => block.trim()).length;
  const text = content.replace(/<!--[\s\S]*?-->/g, '').replace(/\$\$[\s\S]*?\$\$/g, '').replace(/^:::.*$/gm, '').length;
  const height = text * (176 / width + 0.127) + display * 81 + formulas * 76 + images * 0.63 * width + blocks * 27 + boxes * 70;
  return Math.round(height);
}
