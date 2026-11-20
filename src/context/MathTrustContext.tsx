import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import type { SmartbookData } from '../lib/loader';
import { mathTrustedFor } from '../lib/mathTrust';

interface MathTrust {
  /** The copy the book was opened with. */
  opened: SmartbookData;
  /** loadSmartbook, passed in so this module does not load the book registry. */
  serving: (bookId: string) => SmartbookData | null;
}

/** Outside a book there is no copy, and formulas are sanitized. */
const MathTrustContext = createContext<MathTrust | null>(null);

/**
 * Set where a book opens, with the copy loadSmartbook returned. Every component that renders the
 * book's text or formulas calls useMathTrusted and passes the result to the content-core render
 * functions and to their caches.
 */
export function MathTrustProvider({ book, serving, children }: MathTrustProviderProps) {
  const value = useMemo(() => ({ opened: book, serving }), [book, serving]);
  return <MathTrustContext.Provider value={value}>{children}</MathTrustContext.Provider>;
}

interface MathTrustProviderProps {
  book: SmartbookData;
  serving: (bookId: string) => SmartbookData | null;
  children: ReactNode;
}

/** mathTrustedFor the open book: the value to pass as content-core's `mathTrusted`. */
export function useMathTrusted(): boolean {
  const trust = useContext(MathTrustContext);
  const { bookId } = useParams<{ bookId: string }>();
  return trust !== null && bookId !== undefined && mathTrustedFor(trust.opened, trust.serving(bookId));
}
