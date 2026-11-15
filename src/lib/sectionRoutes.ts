import type { SectionKey } from '../types/smartbook';
import { FORMULA_HASH } from './exerciseNav';

export const SECTION_ROUTES: Record<SectionKey, string> = {
  smartbook: '',
  formulario: 'formulario',
  esercizi: 'esercizi',
  esami: 'esami',
  ide: 'laboratorio',
  grafici: 'grafici',
  risposte: 'risposte',
};

/** ponytail: no route yet — hide from nav even if enabled in smartbook.json */
export const UNROUTED_SECTIONS: SectionKey[] = ['risposte'];

/** Desktop-only sections, hidden on phones (max-width 768px). The code editor needs a keyboard. */
export const MOBILE_HIDDEN_SECTIONS: SectionKey[] = ['ide'];

export function sectionPath(bookId: string, key: SectionKey): string {
  const route = SECTION_ROUTES[key];
  return route ? `/libro/${bookId}/${route}` : `/libro/${bookId}`;
}

/** One formula in the formula sheet, which opens on its chapter and lands on it. */
export function formulaSheetPath(bookId: string, formulaId: string): string {
  return `${sectionPath(bookId, 'formulario')}${FORMULA_HASH}${encodeURIComponent(formulaId)}`;
}
