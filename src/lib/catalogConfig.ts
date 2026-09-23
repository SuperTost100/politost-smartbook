import type { GraficoConfig, IdeSnippet, SectionKey, SmartbookConfig } from '../types/smartbook';

const DISABLED_SECTION = { enabled: false, label: '' };

const SECTION_FALLBACK: SmartbookConfig['sections'] = {
  smartbook: { enabled: true, label: 'Capitoli' },
  formulario: DISABLED_SECTION,
  esercizi: DISABLED_SECTION,
  esami: DISABLED_SECTION,
  ide: DISABLED_SECTION,
  grafici: DISABLED_SECTION,
  risposte: DISABLED_SECTION,
};

export interface CatalogSectionFlag {
  enabled: boolean;
  label?: string;
}

export interface CatalogConfigInput {
  id: string;
  title: string;
  subject: string;
  access: string;
  chapters?: Array<{ id: string; number: number; title: string; file: string; printable?: boolean }>;
  sections?: Partial<Record<SectionKey, CatalogSectionFlag>>;
  esercizi?: string;
  esami?: string;
  ide?: IdeSnippet[];
  grafici?: GraficoConfig[];
  assets?: Record<string, string>;
}

function sectionFlag(entry: CatalogConfigInput, key: SectionKey): SmartbookConfig['sections'][SectionKey] {
  const flag = entry.sections?.[key];
  const fallback = SECTION_FALLBACK[key];
  if (!flag || typeof flag.enabled !== 'boolean') return fallback;
  return { enabled: flag.enabled, label: flag.label ?? fallback.label };
}

export function catalogEntryToConfig(entry: CatalogConfigInput): SmartbookConfig {
  return {
    id: entry.id,
    title: entry.title,
    subject: entry.subject,
    access: entry.access === 'licensed' ? 'licensed' : 'public',
    sections: {
      smartbook: sectionFlag(entry, 'smartbook'),
      formulario: sectionFlag(entry, 'formulario'),
      esercizi: sectionFlag(entry, 'esercizi'),
      esami: sectionFlag(entry, 'esami'),
      ide: sectionFlag(entry, 'ide'),
      grafici: sectionFlag(entry, 'grafici'),
      risposte: sectionFlag(entry, 'risposte'),
    },
    chapters: (entry.chapters ?? []).map((chapter) => ({
      ...chapter,
      printable: chapter.printable ?? true,
    })),
  };
}

function sectionEnabled(entry: CatalogConfigInput, key: SectionKey): boolean {
  return entry.sections?.[key]?.enabled === true;
}

/** Payloads load only when the matching flag is on. A flag alone stays empty. */
export function catalogPayloads(entry: CatalogConfigInput): {
  eserciziRaw: string;
  esamiRaw: string;
  ide: IdeSnippet[];
  grafici: GraficoConfig[];
} {
  return {
    eserciziRaw: sectionEnabled(entry, 'esercizi') ? (entry.esercizi ?? '') : '',
    esamiRaw: sectionEnabled(entry, 'esami') ? (entry.esami ?? '') : '',
    ide: sectionEnabled(entry, 'ide') ? (entry.ide ?? []) : [],
    grafici: sectionEnabled(entry, 'grafici') ? (entry.grafici ?? []) : [],
  };
}

export function catalogAssets(entry: CatalogConfigInput): Record<string, string> {
  const assets: Record<string, string> = {};
  for (const [key, value] of Object.entries(entry.assets ?? {})) {
    if (typeof value === 'string') assets[key] = value;
  }
  return assets;
}
