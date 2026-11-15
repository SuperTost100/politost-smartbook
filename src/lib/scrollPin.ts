/**
 * Scrolls an element under the header and keeps it there while the page is still changing
 * height (figures decoding, lazy blocks), until the reader scrolls, taps or presses a key.
 * A smooth scroll aims at where the target was when it started, so without the pin a figure
 * that loads on the way leaves the reader one paragraph short.
 */

interface Pin {
  element: Element;
  release: () => void;
}

let current: Pin | null = null;

const READER_INPUT = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const;

/** The element a landing is holding in place, if the reader has not moved since. */
export function pinnedElement(): Element | null {
  return current?.element ?? null;
}

export function pinIntoView(element: Element, behavior: 'instant' | 'smooth' = 'instant'): () => void {
  current?.release();

  const align = () => element.scrollIntoView({ behavior: 'instant', block: 'start' });
  // While a smooth scroll runs, a correction would cut it short: correct once it ends.
  let settled = behavior === 'instant';
  const settle = () => {
    if (settled) return;
    settled = true;
    align();
  };
  const resizes = new ResizeObserver(() => {
    if (settled) align();
  });
  // shortcut: browsers without `scrollend` settle on this timer, which can end a very long smooth scroll early.
  const timer = settled ? undefined : setTimeout(settle, 2000);

  const pin: Pin = {
    element,
    release: () => {
      if (current !== pin) return;
      current = null;
      resizes.disconnect();
      clearTimeout(timer);
      window.removeEventListener('scrollend', settle);
      for (const type of READER_INPUT) window.removeEventListener(type, pin.release, true);
    },
  };
  current = pin;

  element.scrollIntoView({ behavior, block: 'start' });
  resizes.observe(document.body);
  if (!settled) window.addEventListener('scrollend', settle);
  for (const type of READER_INPUT) window.addEventListener(type, pin.release, { capture: true, passive: true });
  return pin.release;
}
