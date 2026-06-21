import { Link } from 'react-router-dom';

export function BookNotFound() {
  return (
    <div className="book-not-found">
      <h2>Smartbook non trovato</h2>
      <p>Il libro richiesto non esiste o non è disponibile in questo catalogo.</p>
      <Link to="/" className="btn-primary">Torna al catalogo</Link>
    </div>
  );
}
