/** Per-subject colour for book covers and the subject tag. Known subjects get a fixed tone;
 * anything else is hashed onto the palette so each book keeps a stable colour. */
const TONES = ['indigo', 'blue', 'emerald', 'violet', 'cyan', 'rose', 'orange'] as const;
export type SubjectTone = (typeof TONES)[number];

const KNOWN: [RegExp, SubjectTone][] = [
  [/esempio/i, 'indigo'],
  [/fisic/i, 'blue'],
  [/chimic/i, 'emerald'],
  [/matemat|algebra|geometr|analisi/i, 'violet'],
  [/informat/i, 'cyan'],
  [/biolog/i, 'rose'],
];

export function subjectTone(subject: string): SubjectTone {
  const known = KNOWN.find(([re]) => re.test(subject));
  if (known) return known[1];
  let h = 0;
  for (const ch of subject) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return TONES[Math.abs(h) % TONES.length];
}
