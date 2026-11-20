import { useLayoutEffect, type RefObject } from 'react';
import { flagWideFormulas } from '../lib/scrollableMath';

/** The width each root had when it was last measured. */
const measuredWidth = new WeakMap<HTMLElement, number>();
const mounted = new Set<HTMLElement>();
/** Roots the browser is not laying out yet (content-visibility), measured once they come near the screen. */
const waiting = new Set<HTMLElement>();
const toCheck = new Set<HTMLElement>();
const toMeasure = new Set<HTMLElement>();
let flushQueued = false;

/** Whether the browser lays out the root now. Older browsers without the check measure every root. */
function isRendered(root: HTMLElement): boolean {
  return typeof root.checkVisibility !== 'function' || root.checkVisibility({ contentVisibilityAuto: true });
}

function flush() {
  flushQueued = false;
  const now: HTMLElement[] = [];
  for (const root of toCheck) {
    if (!mounted.has(root) || toMeasure.has(root)) continue;
    if (isRendered(root)) now.push(root);
    else wait(root);
  }
  for (const root of toMeasure) if (mounted.has(root)) now.push(root);
  toCheck.clear();
  toMeasure.clear();
  if (now.length === 0) return;
  // Read with the other widths, before the writes.
  for (const root of now) measuredWidth.set(root, root.clientWidth);
  flagWideFormulas(now);
  for (const root of now) {
    waiting.delete(root);
    nearScreen?.unobserve(root);
  }
}

/** One measure for every root that changed in the same task: a chapter mounts dozens of them at once. */
function queue(root: HTMLElement, force: boolean) {
  (force ? toMeasure : toCheck).add(root);
  if (flushQueued) return;
  flushQueued = true;
  queueMicrotask(flush);
}

// Created on first use: these do not exist where the module is imported for tests.
let resizes: ResizeObserver | null = null;
let nearScreen: IntersectionObserver | null = null;

function wait(root: HTMLElement) {
  if (waiting.has(root)) return;
  waiting.add(root);
  nearScreen ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) if (entry.isIntersecting) queue(entry.target as HTMLElement, true);
    },
    { rootMargin: '100% 0px' },
  );
  nearScreen.observe(root);
  if (waiting.size === 1) document.addEventListener('contentvisibilityautostatechange', onVisibilityChange, true);
}

/** A part of the page the browser starts laying out again: measure the roots inside it. */
function onVisibilityChange(event: Event) {
  if ((event as ContentVisibilityAutoStateChangeEvent).skipped) return;
  const target = event.target as Node;
  for (const root of waiting) if (target.contains(root)) queue(root, true);
}

function register(root: HTMLElement) {
  mounted.add(root);
  queue(root, false);
  resizes ??= new ResizeObserver((entries) => {
    for (const { target } of entries) {
      const root = target as HTMLElement;
      // The first report of a root comes right after it is observed: only a new width is news.
      if (mounted.has(root) && measuredWidth.get(root) !== root.clientWidth) queue(root, false);
    }
  });
  resizes.observe(root);
  // Web fonts change the widths once they arrive.
  if (document.fonts && document.fonts.status !== 'loaded') {
    void document.fonts.ready.then(() => {
      if (mounted.has(root)) queue(root, false);
    });
  }
}

function unregister(root: HTMLElement) {
  mounted.delete(root);
  waiting.delete(root);
  measuredWidth.delete(root);
  resizes?.unobserve(root);
  nearScreen?.unobserve(root);
  if (waiting.size === 0) document.removeEventListener('contentvisibilityautostatechange', onVisibilityChange, true);
}

/**
 * Formulas wider than their column scroll sideways, and get `data-wide` and a Tab stop with a name
 * (markScrolling) while they do. Only these: a formula that fits stays out of the Tab order.
 *
 * An inline formula is one unbreakable box, so one wider than the text column would push the whole
 * page sideways: the stylesheet lets the flagged ones scroll inside their line. A scrolling box sits
 * differently on the baseline, so the others stay ordinary inline text. A display formula already
 * sits in a scroll box; the hook only finds the boxes that scroll.
 *
 * The roots mounted together are measured together before the next paint. A root the browser is not
 * laying out yet (a paragraph far from the screen, see content-visibility in ds.css) is measured when
 * it comes near the screen, so opening a chapter does not lay out all of it. A root is measured again
 * when its width changes and when the web fonts arrive.
 *
 * `content` names what the root shows, for a root that keeps its size when its content changes
 * (the formula sheet changing chapter).
 */
export function useScrollableMath(ref: RefObject<HTMLElement | null>, enabled: boolean, content?: unknown) {
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root || !enabled) return;
    register(root);
    return () => unregister(root);
  }, [ref, enabled, content]);
}
