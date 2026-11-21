import { createContext, useContext } from 'react';
import { withoutMathml } from './printMath';

/**
 * Turns the KaTeX HTML of one printed piece into MathML (fastPrint/index.ts). The print page gives
 * it to each part of the sheet in fast print; elsewhere, and in the book's own mode, it is null.
 */
export type PrintMathml = (html: string) => string;

export const PrintMathmlContext = createContext<PrintMathml | null>(null);

export function usePrintMathml(): PrintMathml | null {
  return useContext(PrintMathmlContext);
}

/** The print HTML of KaTeX output: MathML in fast print, else KaTeX without its MathML copy. */
export function printFormulaHtml(html: string, mathml: PrintMathml | null): string {
  return mathml ? mathml(html) : withoutMathml(html);
}
