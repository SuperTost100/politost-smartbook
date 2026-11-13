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
