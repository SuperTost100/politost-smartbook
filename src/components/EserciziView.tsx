import { memo, useMemo, useRef } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import type { ChapterMeta, Exercise, FormulaRef } from '../types/smartbook';
import { ContentFlow } from './ContentFlow';
import { SectionHeader } from './ds/SectionHeader';
import { ExerciseCard } from './ds/ExerciseCard';
import { RevealBlock } from './ds/RevealBlock';
import { ChapterPager, type PagerTarget } from './ds/ChapterPager';
import { DifficultyFilter } from './ds/DifficultyFilter';
import { ChapterPicker } from './ds/ChapterPicker';
import { useIndexDrawer } from './shell/indexDrawer';
import { preprocessContent } from '../lib/parser';
import { useRefClick } from '../hooks/useRefClick';
import { useChapterView, useFocusOnScopeChange } from '../hooks/useChapterView';
import { lastReadChapter } from '../lib/readingPosition';
import { sectionPath } from '../lib/sectionRoutes';
import {
  difficultyCounts,
  entryScopeOf,
  scopeRedirect,
  linkedId,
  scopeSearch,
  itemsInScope,
  EXERCISE_HASH,
  filterByDifficulty,
  findEntry,
  neighbourEntries,
  pagerNote,
  plural,
  type Difficulty,
  type EntryScope,
  type ChapterIndex,
  type ChapterIndexEntry,
  type ExerciseScope,
  type IndexScope,
} from '../lib/exerciseNav';

interface EserciziViewProps {
  bookId: string;
  /** Esercizi gets the chapter index; Prove d'esame is one list. */
  section: 'esercizi' | 'esami';
  exercises: Exercise[];
  title: string;
  /** For the index and for links to a chapter (`ref:chapter/2#p1`). */
  chapters?: ChapterMeta[];
  /** Numbered formulas of the whole book, so (2.1) in a hint resolves. */
  formulaIndex?: Map<string, FormulaRef>;
  resolveAsset?: (src: string) => string | undefined;
}

const NO_CHAPTERS: ChapterMeta[] = [];

interface ExerciseItemProps {
  exercise: Exercise;
  showChapter: boolean;
  formulaIndex?: Map<string, FormulaRef>;
  resolveAsset?: (src: string) => string | undefined;
  onRefClick: (e: React.MouseEvent) => void;
}

/** One card; memoized so opening the drawer or changing the header does not re-render every card. */
const ExerciseItem = memo(function ExerciseItem({ exercise: ex, showChapter, formulaIndex, resolveAsset, onRefClick }: ExerciseItemProps) {
  const flow = (text: string) => (
    <ContentFlow content={preprocessContent(text)} formulaIndex={formulaIndex} resolveAsset={resolveAsset} onRefClick={onRefClick} />
  );
  return (
    <ExerciseCard
      id={ex.id}
      chapter={showChapter ? ex.chapter : undefined}
      difficulty={ex.difficulty}
      hint={ex.hint ? <RevealBlock variant="hint">{flow(ex.hint)}</RevealBlock> : undefined}
      solution={ex.solution ? <RevealBlock variant="solution">{flow(ex.solution)}</RevealBlock> : undefined}
    >
      {flow(ex.question)}
    </ExerciseCard>
  );
});

function emptyMessage(section: EserciziViewProps['section'], scope: ExerciseScope | null, difficulty: Difficulty | null): string {
  const noun = section === 'esami' ? "Nessuna prova d'esame" : 'Nessun esercizio';
  const level = difficulty ? ` di livello ${difficulty}` : '';
  const where = scope === 'altri' ? ' senza capitolo' : typeof scope === 'number' ? ' in questo capitolo' : ' nel libro';
  return `${noun}${level}${where}.`;
}

export function EserciziView({
  bookId,
  section,
  exercises,
  title,
  chapters = NO_CHAPTERS,
  formulaIndex,
  resolveAsset,
}: EserciziViewProps) {
  const view = useChapterView(exercises, chapters, { indexed: section === 'esercizi', all: 'tutti' });
  const { index, scope, difficulty } = view;
  const location = useLocation();
  const navigate = useNavigate();
  const drawer = useIndexDrawer();
  const onRefClick = useRefClick(bookId, chapters);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);
  const basePath = sectionPath(bookId, section);

  const inScope = useMemo(() => itemsInScope(exercises, index, scope), [exercises, index, scope]);
  const shown = useMemo(() => filterByDifficulty(inScope, difficulty), [inScope, difficulty]);
  const counts = useMemo(() => difficultyCounts(inScope), [inScope]);
  useFocusOnScopeChange(scope, location.hash, titleRef);

  const linkedExercise = linkedId(location.hash, EXERCISE_HASH);
  const linked = linkedExercise ? exercises.find((ex) => ex.id === linkedExercise) : undefined;
  const redirect = scopeRedirect(view, linked, index && scope == null && !linked ? lastReadChapter(bookId, chapters) : undefined);
  if (redirect != null) return <Navigate replace to={{ search: redirect, hash: location.hash }} />;

  const entry = findEntry(index, scope);
  const showChapter = section === 'esami' || !index || scope === 'altri';
  const href = (to: IndexScope) => `${basePath}${scopeSearch(to, difficulty)}`;
  const setDifficulty = (level: Difficulty | null) => navigate({ search: scopeSearch(scope, level) });
  const item = (ex: Exercise) => (
    <ExerciseItem
      key={ex.id}
      exercise={ex}
      showChapter={showChapter}
      formulaIndex={formulaIndex}
      resolveAsset={resolveAsset}
      onRefClick={onRefClick}
    />
  );

  const trigger = index && drawer.open ? <ChapterPicker index={index} entry={entry} /> : undefined;

  let body;
  if (exercises.length === 0) {
    body = <p className="empty-note">Nessun esercizio disponibile.</p>;
  } else if (shown.length === 0) {
    body = (
      <div className="sb-empty">
        <p>{emptyMessage(section, scope, difficulty)}</p>
        {difficulty && (
          <button
            type="button"
            className="sb-btn sb-btn-sm"
            onClick={() => {
              setDifficulty(null);
              // The button goes away with the empty state: focus "Tutte", which is now pressed.
              filterRef.current?.querySelector('button')?.focus();
            }}
          >
            Mostra tutte le difficoltà
          </button>
        )}
      </div>
    );
  } else if (index && scope === 'tutti') {
    body = <GroupedList index={index} shown={shown} href={href} item={item} />;
  } else {
    body = <div className="sb-stack">{shown.map(item)}</div>;
  }

  let pager = null;
  if (index && typeof scope === 'number') {
    const { prev, next } = neighbourEntries(index, scope);
    const target = (e?: ChapterIndexEntry): PagerTarget | null =>
      e ? { number: e.number!, title: e.title, href: href(e.scope), note: pagerNote(exercises, index, e, difficulty) } : null;
    pager = <ChapterPager prev={target(prev)} next={target(next)} />;
  }

  return (
    <div className="esercizi-view sb-page sb-page-reading">
      <SectionHeader
        lead={trigger}
        eyebrow={trigger ? undefined : entry ? (entry.number != null ? `Capitolo ${entry.number}` : title) : undefined}
        title={entry ? entry.title : title}
        titleRef={titleRef}
        aside={
          exercises.length > 0 ? (
            <DifficultyFilter value={difficulty} counts={counts} total={inScope.length} onChange={setDifficulty} groupRef={filterRef} />
          ) : undefined
        }
      />
      {body}
      {pager}
    </div>
  );
}

interface GroupedListProps {
  index: ChapterIndex;
  shown: Exercise[];
  href: (scope: IndexScope) => string;
  item: (ex: Exercise) => React.ReactNode;
}

/** "Tutti": the exercises under a heading per chapter, with how many of the chapter's are shown. */
function GroupedList({ index, shown, href, item }: GroupedListProps) {
  const groups = new Map<EntryScope, Exercise[]>();
  for (const ex of shown) {
    const scope = entryScopeOf(ex, index);
    const list = groups.get(scope);
    if (list) list.push(ex);
    else groups.set(scope, [ex]);
  }
  return (
    <>
      {index.entries.map((entry) => {
        const items = groups.get(entry.scope);
        if (!items) return null;
        const total = plural(entry.count, 'esercizio', 'esercizi');
        const headingId = `group-${entry.scope}`;
        return (
          <section key={entry.scope} className="sb-exgroup" aria-labelledby={headingId}>
            <h2 className="sb-exgroup-head" id={headingId}>
              {entry.number != null && (
                <span className="sb-phead-num">
                  <span className="sb-sr">Capitolo </span>
                  {entry.number}
                </span>
              )}
              <Link to={href(entry.scope)}>{entry.title}</Link>
              <span className="sb-exgroup-count">{items.length === entry.count ? total : `${items.length} di ${total}`}</span>
            </h2>
            <div className="sb-stack">{items.map(item)}</div>
          </section>
        );
      })}
    </>
  );
}
