import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ChapterMeta } from '../types/smartbook';
import {
  buildChapterIndex,
  CHAPTER_PARAM,
  DIFFICULTY_PARAM,
  parseDifficulty,
  parseScope,
  type AllScope,
  type ChapterIndex,
  type Difficulty,
  type EntryScope,
} from '../lib/exerciseNav';

export interface ChapterView<A extends AllScope> {
  /** Null for exam questions, and for a section whose items fill too few chapters to need an index. */
  index: ChapterIndex | null;
  /** Null while the URL names no valid chapter. */
  scope: EntryScope | A | null;
  difficulty: Difficulty | null;
}

interface ChapterViewOptions<A extends AllScope> {
  /** False: no index at all (the exam questions). */
  indexed: boolean;
  /** The URL's word for the whole section: `tutti` for exercises, `tutte` for formulas. */
  all: A;
  /** See buildChapterIndex. */
  minChapters?: number;
}

/** The chapter index and the view the URL asks for; the shell and the page read the same state. */
export function useChapterView<A extends AllScope>(
  items: { chapter?: number }[],
  chapters: ChapterMeta[],
  { indexed, all, minChapters }: ChapterViewOptions<A>,
): ChapterView<A> {
  const [params] = useSearchParams();
  const index = useMemo(
    () => (indexed ? buildChapterIndex(items, chapters, minChapters) : null),
    [indexed, items, chapters, minChapters],
  );
  return {
    index,
    scope: parseScope(params.get(CHAPTER_PARAM), index, all),
    difficulty: parseDifficulty(params.get(DIFFICULTY_PARAM)),
  };
}

/**
 * A new chapter starts at the top with focus on its title, as a new page would. The first view and
 * a link to one item (a hash, which lands on the item) keep the browser's own scroll.
 */
export function useFocusOnScopeChange(scope: unknown, hash: string, titleRef: RefObject<HTMLHeadingElement | null>): void {
  const lastScope = useRef(scope);
  useEffect(() => {
    const previous = lastScope.current;
    lastScope.current = scope;
    if (previous === scope || previous === null || hash) return;
    window.scrollTo(0, 0);
    titleRef.current?.focus({ preventScroll: true });
  }, [scope, hash, titleRef]);
}
