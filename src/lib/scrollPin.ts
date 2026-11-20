/**
 * Scrolls an element under the header and keeps it there while the page is still changing
 * height (figures decoding, lazy blocks), until the reader scrolls, taps or presses a key.
 * A smooth scroll aims at where the target was when it started, so without the pin a figure
 * that loads on the way leaves the reader one paragraph short.
 *
 * The landing itself lasts longer than the alignment: `pinnedElement()` keeps naming the target
 * until the reader scrolls on purpose. A tap, such as the one on a section tab, only stops the
 * alignment, so a page that shifts while the reader leaves cannot pass off another paragraph as read.
 */

interface Pin {
  element: Element;
  release: () => void;
}

let current: Pin | null = null;

const READER_INPUT = ['wheel', 'touchstart', 'touchmove', 'pointerdown', 'keydown'] as const;
const SCROLL_KEYS = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ']);

/** Input that moves the page: the wheel, a swipe, a scrolling key, the scrollbar or the middle button. */
function scrollsThePage(event: Event): boolean {
  if (event.type === 'wheel' || event.type === 'touchmove') return true;
  if (event.type === 'keydown') return SCROLL_KEYS.has((event as KeyboardEvent).key);
  if (event.type === 'pointerdown') {
    const { button, clientX, clientY } = event as PointerEvent;
    const root = document.documentElement;
    return button === 1 || clientX >= root.clientWidth || clientY >= root.clientHeight;
  }
  return false;
}

/** The element a landing points at, until the reader scrolls on purpose or lands elsewhere. */
export function pinnedElement(): Element | null {
  // A chapter change removes the target from the page. Paragraph ids repeat across chapters, so a
  // landing kept past its own chapter would name a paragraph of the new one.
  if (current && !current.element.isConnected) current.release();
  return current?.element ?? null;
}

/**
 * `top`, when given, is where the element's top goes, in pixels from the top of the viewport, instead
 * of under the header at its scroll margin: the place it had when the reader left (scrollAnchor).
 */
export function pinIntoView(element: Element, behavior: 'instant' | 'smooth' = 'instant', top?: number): () => void {
  current?.release();

  const align = () => {
    if (top === undefined) element.scrollIntoView({ behavior: 'instant', block: 'start' });
    else window.scrollBy({ top: element.getBoundingClientRect().top - top, behavior: 'instant' });
  };
  // While a smooth scroll runs, a correction would cut it short: correct once it ends.
  let settled = behavior === 'instant';
  let aligning = true;
  const settle = () => {
    if (settled) return;
    settled = true;
    if (aligning) align();
  };
  const resizes = new ResizeObserver(() => {
    // A target that left the page (the chapter unmounted) has nothing to hold.
    if (!element.isConnected) pin.release();
    else if (settled && aligning) align();
  });
  // shortcut: browsers without `scrollend` settle on this timer, which can end a very long smooth scroll early.
  const timer = settled ? undefined : setTimeout(settle, 2000);

  const onInput = (event: Event) => {
    aligning = false;
    resizes.disconnect();
    if (scrollsThePage(event)) pin.release();
  };
  const pin: Pin = {
    element,
    release: () => {
      if (current !== pin) return;
      current = null;
      resizes.disconnect();
      clearTimeout(timer);
      window.removeEventListener('scrollend', settle);
      for (const type of READER_INPUT) window.removeEventListener(type, onInput, true);
    },
  };
  current = pin;

  if (top === undefined) element.scrollIntoView({ behavior, block: 'start' });
  else align();
  resizes.observe(document.body);
  if (!settled) window.addEventListener('scrollend', settle);
  for (const type of READER_INPUT) window.addEventListener(type, onInput, { capture: true, passive: true });
  return pin.release;
}
