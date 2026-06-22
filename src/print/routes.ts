export type PrintSection = 'capitolo' | 'formulario' | 'esercizi' | 'esami';

export interface PrintTarget {
  bookId: string;
  section: PrintSection;
  chapterId?: string;
}

export function buildPrintUrl(
  bookId: string,
  section: PrintSection,
  options?: { chapterId?: string; returnTo?: string },
): string {
  let path: string;
  switch (section) {
    case 'capitolo':
      if (!options?.chapterId) throw new Error('chapterId required for capitolo print');
      path = `/libro/${bookId}/stampa/capitolo/${options.chapterId}`;
      break;
    case 'formulario':
      path = `/libro/${bookId}/stampa/formulario`;
      break;
    case 'esercizi':
      path = `/libro/${bookId}/stampa/esercizi`;
      break;
    case 'esami':
      path = `/libro/${bookId}/stampa/esami`;
      break;
  }

  if (options?.returnTo) {
    return `${path}?${new URLSearchParams({ return: options.returnTo })}`;
  }
  return path;
}

export function getReturnUrl(search: string, fallback: string): string {
  const ret = new URLSearchParams(search).get('return');
  return ret?.startsWith('/') ? ret : fallback;
}
