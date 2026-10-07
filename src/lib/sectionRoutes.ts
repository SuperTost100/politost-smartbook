import type { SectionKey } from '../types/smartbook';

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

/** Desktop-only sections — hidden on phones (max-width 768px) */
export const MOBILE_HIDDEN_SECTIONS: SectionKey[] = ['ide', 'grafici'];

export function sectionPath(bookId: string, key: SectionKey): string {
  const route = SECTION_ROUTES[key];
  return route ? `/libro/${bookId}/${route}` : `/libro/${bookId}`;
}
