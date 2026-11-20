/**
 * Where the reader was in a chapter, kept per history entry, so going back or forward (or reloading)
 * shows the same text at the same place. The pixel offset the browser restores is not enough: a
 * chapter fills in a piece at a time and the paragraphs off screen have estimated heights, so the
 * same offset shows other text. The anchor names the block at the top of the screen instead.
 */
export interface ScrollAnchor {
  /** The paragraph's id (`p3`). */
  paragraph: string;
  /** The piece of the paragraph (splitContentPieces), and the block in it; -1 for the paragraph's top. */
  piece: number;
  block: number;
  /** The anchor's top, in pixels from the top of the viewport. */
  top: number;
}

const STORAGE_KEY = 'politost-scroll-anchors';
/** History entries kept; the oldest written leave first. */
const MAX_ENTRIES = 100;

type Store = Record<string, ScrollAnchor>;

function readStore(storage: Storage): Store {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(STORAGE_KEY) ?? '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Store) : {};
  } catch {
    return {};
  }
}

function isAnchor(value: unknown): value is ScrollAnchor {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.paragraph === 'string' && Number.isInteger(v.piece) && Number.isInteger(v.block) && typeof v.top === 'number';
}

export function saveScrollAnchor(entry: string, anchor: ScrollAnchor, storage: Storage = sessionStorage): void {
  try {
    const store = readStore(storage);
    delete store[entry];
    store[entry] = anchor;
    const keys = Object.keys(store);
    for (const key of keys.slice(0, Math.max(0, keys.length - MAX_ENTRIES))) delete store[key];
    storage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Storage full or disabled: the browser's own scroll restoration is what remains.
  }
}

export function readScrollAnchor(entry: string, storage: Storage = sessionStorage): ScrollAnchor | undefined {
  try {
    const anchor = readStore(storage)[entry];
    return isAnchor(anchor) ? anchor : undefined;
  } catch {
    return undefined;
  }
}

/**
 * The anchor for what is at `y` pixels from the top of the viewport: the block of chapter text there,
 * or the paragraph when the point falls between blocks. Null outside the chapter's paragraphs.
 */
export function anchorAt(article: Element, x: number, y: number): ScrollAnchor | null {
  const hit = document.elementFromPoint(x, y);
  const section = hit?.closest<HTMLElement>('.paragraph-section');
  if (!hit || !section || !article.contains(section)) return null;
  const body = section.querySelector('.paragraph-body');
  const flow = hit.closest('.content-flow');
  let piece = -1;
  let block = -1;
  let element: Element = section;
  if (body && flow && flow.parentElement === body) {
    // Between two blocks the point hits the flow itself: the block just below it is the anchor.
    const child = [...flow.children].find((c) => c.contains(hit)) ?? [...flow.children].find((c) => c.getBoundingClientRect().bottom > y);
    piece = [...body.children].indexOf(flow);
    if (child) {
      block = [...flow.children].indexOf(child);
      element = child;
    }
  }
  return { paragraph: section.id, piece, block, top: Math.round(element.getBoundingClientRect().top) };
}

/** The element an anchor names, once its piece is on the page. */
export function anchorElement(article: Element, anchor: ScrollAnchor): Element | null {
  const section = [...article.querySelectorAll<HTMLElement>('.paragraph-section')].find((s) => s.id === anchor.paragraph);
  if (!section) return null;
  if (anchor.piece < 0) return section;
  const flow = section.querySelector('.paragraph-body')?.children[anchor.piece];
  if (!flow?.classList.contains('content-flow')) return null;
  return anchor.block < 0 ? flow : (flow.children[anchor.block] ?? null);
}
