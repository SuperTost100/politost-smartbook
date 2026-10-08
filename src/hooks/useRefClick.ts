import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Click handler for a ContentFlow: follows the in-book links (`ref:formula/2.1`,
 * `ref:chapter/3#p2`) that ContentFlow renders as `.smartbook-ref` buttons.
 */
export function useRefClick(bookId: string, chapters: { id: string; number: number }[]) {
  const navigate = useNavigate();
  return useCallback(
    (e: React.MouseEvent) => {
      const target = (e.target as HTMLElement).closest<HTMLElement>('.smartbook-ref');
      const ref = target?.dataset.ref;
      if (!ref) return;
      e.preventDefault();

      if (ref.startsWith('formula/')) {
        navigate(`/libro/${bookId}/formulario#${ref.slice('formula/'.length)}`);
      } else if (ref.startsWith('chapter/')) {
        const [chNum, para] = ref.slice('chapter/'.length).split('#');
        const ch = chapters.find((c) => c.number === Number(chNum));
        if (ch) navigate(`/libro/${bookId}/capitolo/${ch.id}${para ? `#${para}` : ''}`);
      }
    },
    [bookId, chapters, navigate],
  );
}
