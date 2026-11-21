/**
 * How the print page draws formulas (docs/Print.md, "Formule"). `best` is KaTeX, as in the book.
 * `fast` is MathML from Temml, which the browser lays out and prints many times faster. A slow
 * device gets `fast` from its first visit; a choice the student makes by hand wins over that for
 * good. Both live in localStorage, for every book on this device.
 */
export type FormulaMode = 'best' | 'fast';

/** Where the mode came from: the student's own choice, or the measurement of this device. */
export type FormulaModeSource = 'chosen' | 'device';

export interface FormulaModeDecision {
  mode: FormulaMode;
  source: FormulaModeSource;
}

export interface FormulaModeInputs {
  /** The mode the student picked by hand, if any. */
  chosen: FormulaMode | null;
  /** measureLayoutSpeed's result in ms, or null when this device has not been measured yet. */
  layoutMs: number | null;
  /** navigator.hardwareConcurrency and navigator.deviceMemory (GB), when the browser gives them. */
  cores?: number;
  memoryGb?: number;
}

/**
 * Above this measurement, printing Fisica 1 as a whole book in `best` mode takes more than about a
 * minute (calibration table in docs/Print.md).
 */
export const SLOW_LAYOUT_MS = 40;

/**
 * Two cores or 2 GB of memory: the device is slow at laying out a whole book whatever one short
 * measurement says, because the browser lays out and prints on few threads and swaps.
 */
const FEW_CORES = 2;
const LITTLE_MEMORY_GB = 2;

/**
 * The mode to print with. Null means the device has to be measured first, because nothing else
 * decides it.
 */
export function decideFormulaMode({ chosen, layoutMs, cores, memoryGb }: FormulaModeInputs): FormulaModeDecision | null {
  if (chosen) return { mode: chosen, source: 'chosen' };
  if ((cores !== undefined && cores > 0 && cores <= FEW_CORES) || (memoryGb !== undefined && memoryGb > 0 && memoryGb <= LITTLE_MEMORY_GB)) {
    return { mode: 'fast', source: 'device' };
  }
  if (layoutMs === null) return null;
  return { mode: layoutMs > SLOW_LAYOUT_MS ? 'fast' : 'best', source: 'device' };
}

const STORAGE_KEY = 'politost-print-formulas';
/** Bump it when measureLayoutSpeed changes, so every device is measured again with the new one. */
export const MEASUREMENT_VERSION = 1;

export interface FormulaModePrefs {
  chosen: FormulaMode | null;
  layoutMs: number | null;
}

type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>;

function storage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

const isMode = (value: unknown): value is FormulaMode => value === 'best' || value === 'fast';

export function readFormulaModePrefs(store: Storage | null = storage()): FormulaModePrefs {
  try {
    const parsed: unknown = JSON.parse(store?.getItem(STORAGE_KEY) ?? '{}');
    const v = (parsed && typeof parsed === 'object' ? parsed : {}) as Record<string, unknown>;
    const measured = v.version === MEASUREMENT_VERSION && typeof v.layoutMs === 'number' && Number.isFinite(v.layoutMs) && v.layoutMs >= 0;
    return { chosen: isMode(v.chosen) ? v.chosen : null, layoutMs: measured ? (v.layoutMs as number) : null };
  } catch {
    return { chosen: null, layoutMs: null };
  }
}

function write(patch: Partial<FormulaModePrefs>, store: Storage | null): void {
  try {
    const next = { ...readFormulaModePrefs(store), ...patch };
    store?.setItem(STORAGE_KEY, JSON.stringify({ chosen: next.chosen ?? undefined, layoutMs: next.layoutMs ?? undefined, version: MEASUREMENT_VERSION }));
  } catch {
    // Storage full or disabled: the page still prints, it only asks again next time.
  }
}

export function rememberFormulaChoice(mode: FormulaMode, store: Storage | null = storage()): void {
  write({ chosen: mode }, store);
}

export function rememberLayoutSpeed(layoutMs: number, store: Storage | null = storage()): void {
  write({ layoutMs }, store);
}
