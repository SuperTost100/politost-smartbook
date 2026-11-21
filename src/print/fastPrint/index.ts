import './fastPrint.css';
import { katexToMathml } from '../../lib/printMathml';
import { renderTemml } from '../../lib/temmlRender';

/**
 * Fast print, loaded only when it is used (formulaMode.ts): Temml, its stylesheet and the STIX Two
 * Math font stay out of the reader and out of the print page in the book's own mode.
 */
export function toMathml(html: string): string {
  return katexToMathml(html, renderTemml);
}

/** One formula as MathML, for the samples of "Vedi la differenza"; null when Temml cannot draw it. */
export function formulaMathml(tex: string): string | null {
  return renderTemml(tex, true);
}
