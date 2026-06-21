import { useEffect, useRef } from 'react';

/** Misura header + section nav e imposta --app-chrome-height per elementi sticky sottostanti */
export function useAppChromeHeight() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      document.documentElement.style.setProperty(
        '--app-chrome-height',
        `${el.offsetHeight}px`
      );
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    window.addEventListener('resize', update);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  return ref;
}
