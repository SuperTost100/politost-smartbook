import type { Ref } from 'react';
import { DIFFICULTIES, type Difficulty } from '../../lib/exerciseNav';

const LABELS: Record<Difficulty, string> = { facile: 'Facile', medio: 'Medio', difficile: 'Difficile' };

interface DifficultyFilterProps {
  value: Difficulty | null;
  /** How many of the exercises on screen have each level. */
  counts: Record<Difficulty, number>;
  total: number;
  onChange: (value: Difficulty | null) => void;
  groupRef?: Ref<HTMLDivElement>;
}

/** Tutte, Facile, Medio, Difficile with their counts, on the pressed track of the section switcher. */
export function DifficultyFilter({ value, counts, total, onChange, groupRef }: DifficultyFilterProps) {
  const options: [Difficulty | null, string, number][] = [
    [null, 'Tutte', total],
    ...DIFFICULTIES.map((d): [Difficulty, string, number] => [d, LABELS[d], counts[d]]),
  ];
  return (
    <div ref={groupRef} className="sb-tabs sb-filter no-print" role="group" aria-label="Difficoltà">
      {options.map(([level, label, n]) => {
        const on = level === value;
        return (
          <button
            key={label}
            type="button"
            className="sb-tab"
            aria-pressed={on}
            // An empty level cannot be chosen, but the current one stays reachable.
            disabled={n === 0 && !on}
            onClick={() => {
              if (!on) onChange(level);
            }}
          >
            {label} <span className="sb-filter-n">{n}</span>
          </button>
        );
      })}
    </div>
  );
}
