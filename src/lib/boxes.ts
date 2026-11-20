import type { BoxBlock, ContentBlock, InlineSegment } from './renderContent';

/** The look a box takes: the six kinds of variant A share four. */
export type BoxTone = 'definition' | 'theorem' | 'mistake' | 'plain';

/** The word of the label, as the spec lists them. */
const WORDS = {
  definition: 'Definizione',
  theorem: 'Teorema',
  proposition: 'Proposizione',
  corollary: 'Corollario',
  lemma: 'Lemma',
  proof: 'Dimostrazione',
  example: 'Esempio',
  mistake: 'Errore tipico',
  remark: 'Osservazione',
} as const;

/**
 * The prefix of a box's element id. Numbers repeat across kinds (Definizione 1.2, Teorema 1.2,
 * formula 1.2), so the id names the kind. Propositions, corollaries and lemmas share the theorems'
 * numbering, so they share the prefix too and `teorema-1.3` stays unique whatever the kind.
 */
const ID_PREFIX = {
  definition: 'definizione',
  theorem: 'teorema',
  proof: undefined,
  example: 'esempio',
  mistake: 'errore',
  remark: 'osservazione',
} as const;

export function boxWord(box: Pick<BoxBlock, 'box' | 'kind'>): string {
  return box.box === 'theorem' && box.kind ? WORDS[box.kind] : WORDS[box.box];
}

export function boxTone(box: Pick<BoxBlock, 'box'>): BoxTone {
  return box.box === 'definition' || box.box === 'theorem' || box.box === 'mistake' ? box.box : 'plain';
}

/** `teorema-1.2` for a theorem, lemma or corollary 1.2; undefined without an id, and always for a proof. */
export function boxElementId(box: Pick<BoxBlock, 'box' | 'id'>): string | undefined {
  const prefix = ID_PREFIX[box.box];
  return prefix && box.id ? `${prefix}-${box.id}` : undefined;
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", nbsp: ' ' };

/** The plain text of a title: tags dropped and the entities the renderer writes decoded. */
function segmentsText(segments: InlineSegment[]): string {
  return segments
    .map((seg) => {
      if (seg.type === 'text') return seg.html.replace(/<[^>]*>/g, '').replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (_, e: string) => ENTITIES[e]);
      if (seg.type === 'hover') return `(${seg.formulaId})`;
      return 'children' in seg ? segmentsText(seg.children) : '';
    })
    .join('');
}

const comparable = (text: string) => text.trim().replace(/\s+/g, ' ').toLocaleLowerCase('it');

/** The box title as it compares with a formula label, or undefined for a box without a title. */
export function boxTitleKey(title: InlineSegment[] | undefined): string | undefined {
  if (!title?.length) return undefined;
  return comparable(segmentsText(title)) || undefined;
}

/**
 * A formula inside a box whose label is the box's own name ("di Weierstrass" in Teorema 1.2 · di
 * Weierstrass) would show the name twice, so the box hides that label.
 */
export function labelRepeatsTitle(label: string | undefined, titleKey: string | undefined): boolean {
  return titleKey !== undefined && label !== undefined && comparable(label) === titleKey;
}

/**
 * What a block weighs in print, roughly in paragraphs: a figure is several, a list item half of one.
 * A figure with a line of text stays short, because a figure never breaks: such a box broken before
 * its figure would leave a tinted empty band at the foot of the page.
 */
function weight(block: ContentBlock): number {
  switch (block.type) {
    case 'image':
      return 3;
    case 'list':
      return block.items.length / 2;
    default:
      return 1;
  }
}

/**
 * A box short enough to keep on one page in print (`break-inside: avoid`). A longer one may break
 * across pages, because moving it whole to the next page could leave most of a page empty.
 * shortcut: counts blocks, not printed lines, so a single very long paragraph counts as short; the
 * browser then breaks it anyway once it is taller than the page.
 */
export function boxIsShort(blocks: ContentBlock[]): boolean {
  let total = 0;
  for (const block of blocks) total += weight(block);
  return total <= 4;
}
