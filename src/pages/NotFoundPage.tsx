import { Link } from 'react-router-dom';
import { SiteHeader } from '../components/SiteHeader';
import { Footer } from '../components/Footer';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export function NotFoundPage() {
  useDocumentTitle('Pagina non trovata');
  return (
    <div className="site-page">
      <SiteHeader />
      <main id="main-content" className="page-not-found">
        <h1>Pagina non trovata</h1>
        <p>Questo indirizzo non porta a nessuna pagina. Forse il link è incompleto o il libro è stato spostato.</p>
        <Link to="/" className="sb-btn sb-btn-primary">Torna al catalogo</Link>
      </main>
      <Footer />
    </div>
  );
}
