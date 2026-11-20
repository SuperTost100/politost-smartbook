import { useEffect, type RefObject } from 'react';
import { pinnedElement } from '../lib/scrollPin';

/**
 * Keeps the text on screen still when a paragraph above it is laid out again.
 *
 * While the browser skips a paragraph (content-visibility in ds.css), the paragraph keeps an
 * estimate or the height it had when last laid out, and a figure that loaded since is not counted.
 * When such a paragraph straddles the top of the screen, as after a jump down the page, Chrome
 * anchors the scroll to the paragraph itself, so the difference with its real height would move
 * the text below it. The hook scrolls by what the browser did not compensate itself, and keeps a
 * reader at the end of the chapter there. A landing holds its own place (scrollPin), so the hook
 * leaves the page alone while there is one.
 */
export function useSkippedAnchor(articleRef: RefObject<HTMLElement | null>, sectionSelector: string, key: unknown) {
  useEffect(() => {
    const article = articleRef.current;
    if (!article) return;
    const skipped = new Set<Element>();
    const heights = new Map<Element, number>();
    const root = document.documentElement;
    let lastY = window.scrollY;
    let atBottom = false;
    const onScroll = () => {
      lastY = window.scrollY;
      atBottom = lastY > 0 && lastY >= root.scrollHeight - window.innerHeight - 1;
    };
    // The event comes after the resize it causes, so the set still names the paragraph as skipped there.
    const onSkip = (event: Event) => {
      const target = event.target as Element;
      if (!target.matches(sectionSelector)) return;
      if ((event as ContentVisibilityAutoStateChangeEvent).skipped) skipped.add(target);
      else skipped.delete(target);
    };
    const observer = new ResizeObserver((entries) => {
      let shift = 0;
      const moved = window.scrollY - lastY;
      for (const { target, borderBoxSize } of entries) {
        const height = borderBoxSize[0].blockSize;
        const before = heights.get(target);
        heights.set(target, height);
        if (before === undefined || !skipped.has(target)) continue;
        const top = target.getBoundingClientRect().top + moved;
        // Only a paragraph that started above the screen and ended before its bottom moves what the reader sees.
        if (top < 0 && top + before <= window.innerHeight) shift += height - before;
      }
      lastY = window.scrollY;
      if (pinnedElement()) return;
      const missing = shift - moved;
      // A reader who went to the end of the chapter stays there as the paragraphs at the end take their height.
      if (atBottom) window.scrollTo({ top: root.scrollHeight, behavior: 'instant' });
      else if (shift !== 0 && Math.abs(missing) >= 1) window.scrollBy({ top: missing, behavior: 'instant' });
      lastY = window.scrollY;
    });
    article.addEventListener('contentvisibilityautostatechange', onSkip, true);
    for (const section of article.querySelectorAll(sectionSelector)) observer.observe(section);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      observer.disconnect();
      article.removeEventListener('contentvisibilityautostatechange', onSkip, true);
      window.removeEventListener('scroll', onScroll);
    };
  }, [articleRef, sectionSelector, key]);
}
