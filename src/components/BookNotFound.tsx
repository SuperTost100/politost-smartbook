import { Link } from 'react-router-dom';
import { NoticePage } from './NoticePage';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export function BookNotFound() {
  useDocumentTitle('Smartbook non trovato');
  return (
    <NoticePage
      title="Smartbook non trovato"
      text="Il libro richiesto non esiste o non è disponibile in questa libreria."
    >
      <Link to="/" className="sb-btn sb-btn-primary">Torna alla libreria</Link>
    </NoticePage>
  );
}

/** A book that exists but did not open, usually a failed download: what went wrong, a retry and the way back. */
export function BookLoadFailed({ text, onRetry }: { text: string; onRetry: () => void }) {
  useDocumentTitle('Libro non disponibile');
  return (
    <NoticePage role="alert" title="Non riesco ad aprire il libro" text={text}>
      <button type="button" className="sb-btn sb-btn-primary" onClick={onRetry}>Riprova</button>
      <Link to="/" className="sb-btn">Torna alla libreria</Link>
    </NoticePage>
  );
}
