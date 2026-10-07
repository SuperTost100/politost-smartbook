import type { ReactNode } from 'react';

export type Difficulty = 'facile' | 'medio' | 'difficile';

const LEVELS: Record<Difficulty, number> = { facile: 1, medio: 2, difficile: 3 };

/** Difficulty as a three-step bar signal plus the word, so it reads in greyscale and print. */
export function DifficultyTag({ level, children }: { level: Difficulty; children?: ReactNode }) {
  const n = LEVELS[level];
  return (
    <span className={`sb-diff sb-diff-${level}`}>
      <span className="sb-diff-bars" aria-hidden>
        {[1, 2, 3].map((i) => <i key={i} className={i <= n ? 'on' : undefined} />)}
      </span>
      {children ?? level}
    </span>
  );
}
