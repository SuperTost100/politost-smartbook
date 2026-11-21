import { startTransition, useCallback, useEffect, useMemo, useState } from 'react';
import {
  decideFormulaMode,
  readFormulaModePrefs,
  rememberFormulaChoice,
  rememberLayoutSpeed,
  type FormulaMode,
  type FormulaModeDecision,
  type FormulaModePrefs,
} from '../lib/printFormulaMode';
import type { PrintMathml } from './formulaMode';

type FastPrint = typeof import('./fastPrint');

/** The fast-print chunk, loaded once per page. */
let fastPrint: Promise<FastPrint> | null = null;
function loadFastPrint(): Promise<FastPrint> {
  fastPrint ??= import('./fastPrint').catch((err: unknown) => {
    fastPrint = null;
    throw err;
  });
  return fastPrint;
}

function hardware(): { cores?: number; memoryGb?: number } {
  const nav = navigator as Navigator & { deviceMemory?: number };
  return { cores: nav.hardwareConcurrency, memoryGb: nav.deviceMemory };
}

function whenIdle(fn: () => void): () => void {
  if (typeof requestIdleCallback === 'function') {
    const id = requestIdleCallback(fn, { timeout: 300 });
    return () => cancelIdleCallback(id);
  }
  const id = setTimeout(fn, 50);
  return () => clearTimeout(id);
}

export interface FormulaModeState {
  /** The mode chosen, by hand or for this device; null until the device has been measured. */
  decision: FormulaModeDecision | null;
  /** What the sheet prints with: null for KaTeX. Undefined while it is not known yet (measuring, or loading fast print). */
  mathml: PrintMathml | null | undefined;
  /** The fast-print chunk once it has loaded, for the samples of "Vedi la differenza". */
  fast: FastPrint | null;
  /** The student's choice: remembered for every book on this device, and above any measurement. */
  choose: (mode: FormulaMode) => void;
  /** Loading fast print failed (offline, say): the sheet stays KaTeX. */
  failed: boolean;
  /** The measurement or the hardware judge this device slow, whatever the student chose. */
  slowDevice: boolean;
}

/**
 * The formula mode of the print page (docs/Print.md, "Formule"). A device with no choice and no
 * measurement is measured once, when the page is idle, and the sheet waits for the result, so a slow
 * device never lays out the KaTeX it would replace. Fast print loads before the sheet uses it.
 */
export function useFormulaMode(): FormulaModeState {
  // What the decision rests on: the choice and the measurement stored on this device.
  const [prefs, setPrefs] = useState<FormulaModePrefs>(readFormulaModePrefs);
  const decision = useMemo(() => decideFormulaMode({ ...prefs, ...hardware() }), [prefs]);
  const slowDevice = useMemo(() => decideFormulaMode({ chosen: null, layoutMs: prefs.layoutMs, ...hardware() })?.mode === 'fast', [prefs.layoutMs]);
  const [fast, setFast] = useState<FastPrint | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (decision) return;
    let cancelled = false;
    const cancel = whenIdle(() => {
      void import('./deviceSpeed')
        .then(({ measureLayoutSpeed }) => measureLayoutSpeed())
        .then(
          (layoutMs) => {
            rememberLayoutSpeed(layoutMs);
            // A choice made meanwhile, in another tab, still wins.
            if (!cancelled) setPrefs({ chosen: readFormulaModePrefs().chosen, layoutMs });
          },
          () => {
            // The measurement could not load or run (offline, say): the sheet prints with the book's
            // formulas, and the device is measured at the next visit.
            if (!cancelled) setPrefs({ chosen: readFormulaModePrefs().chosen, layoutMs: 0 });
          },
        );
    });
    return () => {
      cancelled = true;
      cancel();
    };
  }, [decision]);

  const wantsFast = decision?.mode === 'fast';
  useEffect(() => {
    if (!wantsFast || fast || failed) return;
    let cancelled = false;
    loadFastPrint().then(
      (module) => {
        if (!cancelled) setFast(module);
      },
      () => {
        if (!cancelled) setFailed(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [wantsFast, fast, failed]);

  const choose = useCallback((mode: FormulaMode) => {
    rememberFormulaChoice(mode);
    setFailed(false);
    setPrefs((p) => ({ ...p, chosen: mode }));
  }, []);

  let mathml: PrintMathml | null | undefined;
  if (!decision) mathml = undefined;
  else if (decision.mode === 'best' || failed) mathml = null;
  else mathml = fast ? fast.toMathml : undefined;
  return { decision, mathml, fast, choose, failed, slowDevice };
}

/**
 * The mode of each part while the sheet switches from one mode to the other: the parts change one
 * per task, in a transition, as useProgressiveParts mounts them, so a whole book never blocks the
 * page. `pending` is the next part to change.
 */
export function usePartMathml(
  keys: string[],
  target: PrintMathml | null | undefined,
): { mathmlOf: (key: string) => PrintMathml | null; pending?: string } {
  const [state, setState] = useState({ target, previous: target, done: new Set<string>() as ReadonlySet<string> });
  // Set during render, so no frame shows the parts switched before their turn.
  if (state.target !== target) {
    // The first mode known is where the sheet starts, not a switch: no part mounts in another mode first.
    if (state.target === undefined) setState({ target, previous: target, done: new Set() });
    // Back to the mode a switch was leaving: the parts that had not switched yet already have it.
    else if (state.previous !== state.target && target === state.previous) {
      setState({ target, previous: state.target, done: new Set(keys.filter((key) => !state.done.has(key))) });
    }
    // A new mode starts over: every part waits for its turn.
    else setState({ target, previous: state.target, done: new Set() });
  }
  const switching = state.previous !== state.target;
  const pending = switching ? keys.find((key) => !state.done.has(key)) : undefined;

  useEffect(() => {
    if (!switching) return;
    const timer = setTimeout(() => {
      startTransition(() =>
        setState((s) => {
          if (s.target !== target) return s;
          // Every part has switched: parts mounted from now on start in the new mode.
          if (pending === undefined) return { ...s, previous: s.target };
          return { ...s, done: new Set(s.done).add(pending) };
        }),
      );
    }, 0);
    return () => clearTimeout(timer);
  }, [switching, pending, target]);

  const mathmlOf = useCallback(
    (key: string) => (state.previous === state.target || state.done.has(key) ? state.target : state.previous) ?? null,
    [state],
  );
  return { mathmlOf, pending };
}
