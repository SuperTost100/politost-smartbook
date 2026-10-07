import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export interface ParagraphItem {
  id: string;
  /** chapter.paragraph, e.g. "2.1" */
  number: string;
  title: string;
}

interface ReaderProgress {
  paragraphs: ParagraphItem[];
  setParagraphs: (items: ParagraphItem[]) => void;
  activeParagraphId?: string;
  setActiveParagraphId: (id: string | undefined) => void;
  /** 0-100, position of the current paragraph in the chapter */
  progress: number;
  jumpTo: (id: string) => void;
}

const ReaderProgressContext = createContext<ReaderProgress | null>(null);

/** Shares the current chapter's paragraphs and reading position between the shell (TOC, rail) and the chapter view. */
export function ReaderProgressProvider({ children }: { children: ReactNode }) {
  const [paragraphs, setParagraphs] = useState<ParagraphItem[]>([]);
  const [activeParagraphId, setActiveParagraphId] = useState<string>();

  const jumpTo = useCallback((id: string) => {
    setActiveParagraphId(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const value = useMemo<ReaderProgress>(() => {
    const idx = paragraphs.findIndex((p) => p.id === activeParagraphId);
    const progress = paragraphs.length && idx >= 0 ? Math.round(((idx + 1) / paragraphs.length) * 100) : 0;
    return { paragraphs, setParagraphs, activeParagraphId, setActiveParagraphId, progress, jumpTo };
  }, [paragraphs, activeParagraphId, jumpTo]);

  return <ReaderProgressContext.Provider value={value}>{children}</ReaderProgressContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useReaderProgress(): ReaderProgress {
  const ctx = useContext(ReaderProgressContext);
  if (!ctx) throw new Error('useReaderProgress must be used within ReaderProgressProvider');
  return ctx;
}
