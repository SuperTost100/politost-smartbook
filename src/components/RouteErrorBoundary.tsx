import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { NoticePage } from './NoticePage';

interface BoundaryProps {
  /** The current path. A new path clears the error, so leaving a broken page works. */
  path: string;
  children: ReactNode;
}

interface BoundaryState {
  error: unknown;
  path: string;
}

class Boundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { error: null, path: this.props.path };

  static getDerivedStateFromError(error: unknown): Partial<BoundaryState> {
    return { error };
  }

  static getDerivedStateFromProps(props: BoundaryProps, state: BoundaryState): Partial<BoundaryState> | null {
    return props.path === state.path ? null : { error: null, path: props.path };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <NoticePage
        role="alert"
        title="Non riesco a mostrare questa pagina"
        text="Qualcosa è andato storto durante il caricamento. Controlla la connessione e riprova, oppure torna alla libreria."
      >
        <button type="button" className="sb-btn sb-btn-primary" onClick={() => window.location.reload()}>
          Riprova
        </button>
        <Link to="/" className="sb-btn">Torna alla libreria</Link>
      </NoticePage>
    );
  }
}

/**
 * Catches a render error or a lazy chunk that fails to load (after a deploy, or offline), so the
 * screen shows a way out instead of going blank.
 */
export function RouteErrorBoundary({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return <Boundary path={pathname}>{children}</Boundary>;
}
