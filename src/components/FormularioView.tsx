import { useCallback, useMemo, useRef } from 'react';
import { Navigate, useLocation, useNavigationType } from 'react-router-dom';
import type { Chapter, FormulaRef, SmartbookConfig } from '../types/smartbook';
import { SectionHeader } from './ds/SectionHeader';
import { FormulaCard } from './ds/FormulaCard';
import { ChapterPicker } from './ds/ChapterPicker';
import { ChapterPager, type PagerTarget } from './ds/ChapterPager';
import { useIndexDrawer } from './shell/indexDrawer';
import { useChapterView, useFocusOnScopeChange } from '../hooks/useChapterView';
import { useProgressiveCount } from '../hooks/useProgressiveCount';
import { formulaHtml } from '../lib/formulaHtmlCache';
import { useMathTrusted } from '../context/MathTrustContext';
import { lastReadChapter } from '../lib/readingPosition';
import { sectionPath } from '../lib/sectionRoutes';
import {
  bookFormulas,
  findEntry,
  FORMULA_HASH,
  FORMULA_INDEX_MIN_CHAPTERS,
  linkedId,
  neighbourEntries,
  plural,
  scopeRedirect,
  scopeSearch,
  type ChapterIndexEntry,
  type IndexScope,
} from '../lib/exerciseNav';

interface FormularioViewProps {
  bookId: string;
  chapters: Chapter[];
  config: SmartbookConfig;
}

const NO_FORMULAS: FormulaRef[] = [];

/**
 * The formula sheet: one chapter at a time through the chapter index, or every chapter ("Tutte").
 * A book whose formulas fill one chapter keeps a single page without the index. A `#formula-…` link
 * opens the formula's chapter and lands on it through the book shell's useScrollToHash, like a
 * paragraph link.
 */
export function FormularioView({ bookId, chapters, config }: FormularioViewProps) {
  const sectionLabel = config.sections.formulario.label;
  const formulas = bookFormulas(chapters);
  const view = useChapterView(formulas, config.chapters, {
    indexed: true,
    all: 'tutte',
    minChapters: FORMULA_INDEX_MIN_CHAPTERS,
  });
  const { index, scope } = view;
  const location = useLocation();
  const drawer = useIndexDrawer();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const basePath = sectionPath(bookId, 'formulario');
  useFocusOnScopeChange(scope, location.hash, titleRef);

  const byChapter = useMemo(() => {
    const map = new Map<number, FormulaRef[]>();
    for (const f of formulas) {
      const list = map.get(f.chapter);
      if (list) list.push(f);
      else map.set(f.chapter, [f]);
    }
    return map;
  }, [formulas]);
  const chapterIds = useMemo(() => new Map(config.chapters.map((c) => [c.number, c.id])), [config.chapters]);
  // "Tutte" shows its chapters one card at a time, each card's formulas rendered in their own task.
  const cardChapters = useMemo(
    () => (index ? config.chapters.filter((c) => byChapter.has(c.number)) : config.chapters),
    [index, config.chapters, byChapter],
  );
  const mathTrusted = useMathTrusted();
  const prepareCard = useCallback(
    (i: number) => byChapter.get(cardChapters[i].number)?.forEach((f) => formulaHtml(f.latex, mathTrusted)),
    [byChapter, cardChapters, mathTrusted],
  );
  // Back or forward shows every card at once, so the browser restores the place the reader left.
  const returning = useNavigationType() === 'POP';
  const shownCards = useProgressiveCount(
    typeof scope === 'number' ? 0 : cardChapters.length,
    returning ? cardChapters.length : 1,
    prepareCard,
    cardChapters,
  );
  const hrefFor = useCallback(
    (f: FormulaRef) => `/libro/${bookId}/capitolo/${chapterIds.get(f.chapter)}#formula-${f.id}`,
    [bookId, chapterIds],
  );

  const linkedFormula = linkedId(location.hash, FORMULA_HASH);
  const linked = linkedFormula ? formulas.find((f) => f.id === linkedFormula) : undefined;
  const redirect = scopeRedirect(
    { index, scope, difficulty: null },
    linked,
    index && scope == null && !linked ? lastReadChapter(bookId, config.chapters) : undefined,
  );
  if (redirect != null) return <Navigate replace to={{ search: redirect, hash: location.hash }} />;

  const entry = findEntry(index, scope);
  const href = (to: IndexScope) => `${basePath}${scopeSearch(to, null)}`;
  const shownCount = entry ? entry.count : formulas.length;
  const trigger = index && drawer.open ? <ChapterPicker index={index} entry={entry} /> : undefined;

  let body;
  if (typeof scope === 'number') {
    body = <FormulaCard formulas={byChapter.get(scope) ?? NO_FORMULAS} hrefFor={hrefFor} />;
  } else {
    // "Tutte" lists the chapters with formulas; without the index the page shows every chapter, as it always did.
    body = (
      <div className="sb-stack">
        {cardChapters.slice(0, shownCards).map((c) => (
          <FormulaCard
            key={c.id}
            chapter={c.number}
            title={c.title}
            titleHref={index ? href(c.number) : undefined}
            formulas={byChapter.get(c.number) ?? NO_FORMULAS}
            hrefFor={hrefFor}
          />
        ))}
      </div>
    );
  }

  let pager = null;
  if (index && typeof scope === 'number') {
    const { prev, next } = neighbourEntries(index, scope);
    const target = (e?: ChapterIndexEntry): PagerTarget | null =>
      e ? { number: e.number!, title: e.title, href: href(e.scope), note: plural(e.count, 'formula', 'formule') } : null;
    pager = <ChapterPager prev={target(prev)} next={target(next)} />;
  }

  return (
    <div className="formulario-view sb-page">
      <SectionHeader
        lead={trigger}
        eyebrow={trigger || !entry ? undefined : `Capitolo ${entry.number}`}
        title={entry ? entry.title : sectionLabel}
        titleRef={titleRef}
        meta={<span>{plural(shownCount, 'formula', 'formule')} · scegli una riga per aprirla nel capitolo</span>}
      />
      {body}
      {pager}
    </div>
  );
}
