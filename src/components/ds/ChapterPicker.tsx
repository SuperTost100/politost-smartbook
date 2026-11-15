import { ChevronDown } from 'lucide-react';
import { useIndexDrawer } from '../shell/indexDrawer';
import type { ChapterIndex, ChapterIndexEntry } from '../../lib/exerciseNav';

/** What the control says: "Capitolo 3 di 17", or the whole section. */
function scopeName(index: ChapterIndex, entry: ChapterIndexEntry | undefined): string {
  if (!entry) return 'Tutti i capitoli';
  return entry.number != null ? `Capitolo ${entry.number} di ${index.chapterCount}` : entry.title;
}

/**
 * The chapter control above a section's title on a phone: it names the chapter shown and opens the
 * index drawer. Null where the index sits in the side panel instead.
 */
export function ChapterPicker({ index, entry }: { index: ChapterIndex | null; entry: ChapterIndexEntry | undefined }) {
  const drawer = useIndexDrawer();
  if (!index || !drawer.open) return null;
  return (
    <button
      type="button"
      className="sb-btn sb-btn-sm sb-chpicker"
      aria-haspopup="dialog"
      aria-expanded={drawer.expanded}
      onClick={drawer.open}
    >
      <span>
        {scopeName(index, entry)}
        <span className="sb-sr">, scegli il capitolo</span>
      </span>
      <ChevronDown size={16} strokeWidth={1.75} aria-hidden />
    </button>
  );
}
