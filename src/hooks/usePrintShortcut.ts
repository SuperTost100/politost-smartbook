import { useEffect, useEffectEvent } from 'react';

/**
 * Ctrl+P / Cmd+P runs `onPrint` instead of the browser printing the screen page.
 * Without a handler the shortcut keeps its default.
 */
export function usePrintShortcut(onPrint: (() => void) | undefined) {
  const handle = useEffectEvent((event: KeyboardEvent) => {
    if (!onPrint) return;
    if (!(event.ctrlKey || event.metaKey) || event.altKey || event.shiftKey) return;
    if (event.key.toLowerCase() !== 'p') return;
    event.preventDefault();
    onPrint();
  });

  useEffect(() => {
    const listener = (event: KeyboardEvent) => handle(event);
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, []);
}
