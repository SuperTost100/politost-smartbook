import type { PtsbCover } from '../../design-system/theme/ptsb-tokens';

/** The line drawing on a cover. `generic` is the open book from the logo. */
export type CoverArt = 'fisica' | 'analisi' | 'chimica' | 'geometria' | 'generic';

export interface SubjectLook {
  cover: PtsbCover;
  art: CoverArt;
}

const KNOWN: [RegExp, SubjectLook][] = [
  [/esempio/i, { cover: 'ochre', art: 'generic' }],
  [/fisic/i, { cover: 'terracotta', art: 'fisica' }],
  [/chimic/i, { cover: 'slate', art: 'chimica' }],
  [/geometr|algebra/i, { cover: 'plum', art: 'geometria' }],
  [/analisi|matemat/i, { cover: 'sage', art: 'analisi' }],
  [/informat/i, { cover: 'teal', art: 'generic' }],
  [/biolog/i, { cover: 'moss', art: 'generic' }],
];

/** Ochre stays for the example guide, so other books never look like it. */
const HASHED: PtsbCover[] = ['terracotta', 'sage', 'slate', 'plum', 'teal', 'moss'];

/** Cover colour and drawing for a subject. Known subjects are fixed; anything else is hashed
 * onto the palette, so each book keeps the same cover. */
export function subjectLook(subject: string): SubjectLook {
  const known = KNOWN.find(([re]) => re.test(subject));
  if (known) return known[1];
  let h = 0;
  for (const ch of subject) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return { cover: HASHED[Math.abs(h) % HASHED.length], art: 'generic' };
}
