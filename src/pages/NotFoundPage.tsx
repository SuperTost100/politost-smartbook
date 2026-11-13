import { Link } from 'react-router-dom';
import { NoticePage } from '../components/NoticePage';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export function NotFoundPage() {
  useDocumentTitle('Pagina non trovata');
  return (
    <NoticePage
      title="Pagina non trovata"
      text="Questo indirizzo non porta a nessuna pagina. Forse il link è incompleto o il libro è stato spostato."
    >
      <Link to="/" className="sb-btn sb-btn-primary">Torna alla libreria</Link>
    </NoticePage>
  );
}
